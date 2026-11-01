/*
 * Lambda: the live cursors' circuit breaker (Node.js runtime, AWS SDK v3 built in).
 *
 * The browser's API key is public, so anyone could run up the bill. This deletes the
 * API's keys: every connection, subscription and publish then fails, and the bill stops
 * growing. Restore with `npm run restore` in infra/, then redeploy the site.
 *
 * - Through SNS: a CloudWatch alarm on a burst of traffic (infra/realtime.ts), or the
 *   AppSync budget once the month's actual charges pass the cap
 * - Every 15 minutes: an estimate of this month's spend. Past the cap it raises its own
 *   alarm on the alarms' SNS topic, so the keys go and the email arrives as for a burst.
 */
import { AppSyncClient, DeleteApiKeyCommand, ListApiKeysCommand } from "@aws-sdk/client-appsync";
import { CloudWatchClient, GetMetricDataCommand } from "@aws-sdk/client-cloudwatch";
import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";

const appsync = new AppSyncClient({});
const cloudwatch = new CloudWatchClient({});
const sns = new SNSClient({});
const apiId = process.env.API_ID;

const CAP_ALARM = "lesas-realtime-monthly-cap";
// AppSync Events: $1.00 per million operations
const USD_PER_OPERATION = 1 / 1_000_000;
const PERIOD_S = 300;

export async function handler(event) {
  if (event?.source === "aws.events") return checkSpend();

  // Alarms send JSON; budgets send text, with the budget's name in the subject
  const alarms = (event?.Records ?? []).map((record) => {
    try {
      return JSON.parse(record.Sns.Message).AlarmName;
    } catch {
      return record.Sns.Subject ?? "unknown";
    }
  });

  const apiKeys = await listKeys();
  for (const key of apiKeys) {
    await appsync.send(new DeleteApiKeyCommand({ apiId, id: key.id }));
  }
  console.log(
    JSON.stringify({ cutoff: true, apiId, deletedKeys: apiKeys.length, alarms })
  );
}

async function listKeys() {
  const { apiKeys = [] } = await appsync.send(new ListApiKeysCommand({ apiId }));
  return apiKeys;
}

async function checkSpend() {
  // Already cut off: nothing left to stop, and no repeat emails
  if ((await listKeys()).length === 0) return;

  // From the start of the month, or from when the current key was made if that's later
  const now = Date.now();
  const today = new Date(now);
  const monthStart = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1);
  const step = PERIOD_S * 1000;
  const since = Math.ceil(Math.max(monthStart, Date.parse(process.env.KEY_CREATED) || 0) / step) * step;
  if (since >= now) return;

  const metric = (name) => ({
    Id: name.toLowerCase(),
    MetricStat: {
      Metric: { Namespace: "AWS/AppSync", MetricName: name, Dimensions: [{ Name: "EventAPIId", Value: apiId }] },
      Period: PERIOD_S,
      Stat: "Sum",
    },
  });
  const { MetricDataResults = [] } = await cloudwatch.send(
    new GetMetricDataCommand({
      StartTime: new Date(since),
      EndTime: new Date(now),
      MetricDataQueries: [
        "InboundMessages",
        "OutboundMessages",
        "ConnectRequests",
        "SubscribeSuccess",
        "SubscribeClientError",
      ].map(metric),
    })
  );
  const total = (id) =>
    (MetricDataResults.find((result) => result.Id === id)?.Values ?? []).reduce((sum, value) => sum + value, 0);

  // Billed operations: a publish counts twice (the message and its handler), a delivery
  // once, a connection attempt once, a subscription twice (it and its unsubscribe), a
  // refused subscription once. Connection minutes are left out: under the
  // ActiveConnections alarm they come to about $1 a month at most.
  const operations =
    2 * total("inboundmessages") +
    total("outboundmessages") +
    total("connectrequests") +
    2 * total("subscribesuccess") +
    total("subscribeclienterror");
  const spend = operations * USD_PER_OPERATION;
  const cap = Number(process.env.MONTHLY_CAP_USD);
  console.log(JSON.stringify({ check: "spend", since: new Date(since).toISOString(), operations, spend, cap }));
  // A missing or broken cap cuts off too, rather than leaving the bill open
  if (spend <= cap) return;

  const text =
    `lesas.dev live cursors: about $${spend.toFixed(2)} of AppSync traffic since ` +
    `${new Date(since).toISOString()}, past the $${cap} monthly cap, so the API keys were deleted.`;
  await sns.send(
    new PublishCommand({
      TopicArn: process.env.TOPIC_ARN,
      Subject: "lesas.dev live cursors: monthly cap reached",
      // This Lambda reads the alarm name from the default message; email gets the text
      MessageStructure: "json",
      Message: JSON.stringify({ default: JSON.stringify({ AlarmName: CAP_ALARM, text }), email: text }),
    })
  );
}
