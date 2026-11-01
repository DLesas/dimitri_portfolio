/**
 * Live cursors on the home page: an AppSync Events API, its `cursors` channel and the
 * browser's public API key, plus an automatic cutoff if the traffic looks like abuse.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { costBudget } from "./budget";
import { alertEmail, cutoffRoleArn, realtimeMonthlyCapUsd } from "./config";
import { BUDGETS, CUTOFF } from "./names";

const api = new aws.appsync.Api("realtime", {
  name: "lesas-dev-realtime",
  // Browsers connect, subscribe and publish with a public API key; the channel's
  // handler (handlers/cursors.js) only lets cursor messages through
  eventConfig: {
    authProviders: [{ authType: "API_KEY" }],
    connectionAuthModes: [{ authType: "API_KEY" }],
    defaultPublishAuthModes: [{ authType: "API_KEY" }],
    defaultSubscribeAuthModes: [{ authType: "API_KEY" }],
  },
});

new aws.appsync.ChannelNamespace("cursors", {
  apiId: api.apiId,
  name: "cursors",
  codeHandlers: fs.readFileSync(path.join(__dirname, "handlers", "cursors.js"), "utf8"),
});

// AppSync keys last at most a year. The expiry is set when the key is created and then
// ignored, so deploys don't replace it; `npm run renew-key` swaps in a fresh one, and the
// site then needs a rebuild to pick it up (`npm run rebuild-site`, rebuild-site.sh).
const YEAR_MS = 364 * 24 * 60 * 60 * 1000;
export const apiKey = new aws.appsync.ApiKey(
  "browser",
  {
    apiId: api.apiId,
    description: "Public key the site's visitors connect with (lesas.dev live cursors)",
    expires: new Date(Date.now() + YEAR_MS).toISOString().replace(/\.\d{3}Z$/, "Z"),
  },
  { ignoreChanges: ["expires"] }
);

export const httpHost = api.dns.apply((dns) => dns["HTTP"]);
export const realtimeHost = api.dns.apply((dns) => dns["REALTIME"]);

/** What the site connects with. NEXT_PUBLIC_ values are built in, so changes need a redeploy. */
export const realtimeEnv: Record<string, pulumi.Input<string>> = {
  NEXT_PUBLIC_REALTIME_HTTP_HOST: httpHost,
  NEXT_PUBLIC_REALTIME_WS_HOST: realtimeHost,
  NEXT_PUBLIC_REALTIME_API_KEY: apiKey.key,
};

// ---- Automatic cutoff ----

// The API key is public, so anyone could run up the bill. Three checks share one way out:
// a Lambda deletes the API's keys, which stops all traffic within a few minutes, and an
// email says so. `npm run restore` brings a new key back, after which the site needs a
// rebuild (`npm run rebuild-site`, rebuild-site.sh).
//
// - Bursts: AppSync reports traffic every minute, and an alarm fires if any of these
//   passes its limit (far above real use: a handful of visitors sends a few thousand
//   messages a minute). They're read per API (EventAPIId): that's where AppSync reports them.
// - Slow drains kept under those limits: every 15 minutes the Lambda estimates this
//   month's spend, counted from when the current key was made, and cuts off past the cap.
// - Anything else AppSync bills: a budget on the month's actual AppSync charges. The bill
//   lags by up to a day, so this is the backstop, not the first line.
const CUTOFF_LIMITS = {
  InboundMessages: 30_000, // messages published per minute
  OutboundMessages: 200_000, // messages delivered per minute (published × subscribers)
  ConnectRequests: 3_000, // connections opened per minute, failed ones included
  SubscribeSuccess: 3_000, // subscriptions made per minute
  SubscribeClientError: 3_000, // subscriptions refused per minute
  ActiveConnections: 300, // open connections
};

const cutoffTopic = new aws.sns.Topic("realtime-cutoff", { name: CUTOFF });

const cutoffLogs = new aws.cloudwatch.LogGroup("realtime-cutoff", {
  name: `/aws/lambda/${CUTOFF}`,
  retentionInDays: 30,
});
const cutoff = new aws.lambda.Function(
  "realtime-cutoff",
  {
    name: CUTOFF,
    description: "Deletes the live cursors' API keys when their traffic looks like abuse",
    runtime: aws.lambda.Runtime.NodeJS22dX,
    handler: "cutoff.handler",
    code: new pulumi.asset.AssetArchive({
      "cutoff.mjs": new pulumi.asset.FileAsset(path.join(__dirname, "handlers", "cutoff.mjs")),
    }),
    // Allowed to delete the API's keys, read its traffic and publish to the topic
    // (access/index.ts)
    role: cutoffRoleArn,
    memorySize: 128,
    timeout: 15,
    environment: {
      variables: {
        API_ID: api.apiId,
        TOPIC_ARN: cutoffTopic.arn,
        MONTHLY_CAP_USD: realtimeMonthlyCapUsd,
        // The key's expiry is set a year ahead, so this is when it was made: a restored
        // key starts the month's count afresh (without one, the count starts at the month).
        // AppSync rounds expiries down to the hour, so a key restored in the same hour as
        // a cutoff counts that hour's burst too, and is cut off again.
        KEY_CREATED: apiKey.expires.apply((expires) =>
          expires ? new Date(Date.parse(expires) - YEAR_MS).toISOString() : ""
        ),
      },
    },
  },
  { dependsOn: [cutoffLogs] }
);

/** Lets `principal` invoke the cutoff, from `sourceArn` only */
const allowCutoffFrom = (name: string, principal: string, sourceArn: pulumi.Input<string>) =>
  new aws.lambda.Permission(`realtime-cutoff-from-${name}`, {
    action: "lambda:InvokeFunction",
    function: cutoff.name,
    principal,
    sourceArn,
  });
/**
 * Runs the cutoff on every message to `topic`: a permission lets SNS invoke it, and a
 * subscription delivers them (`permission` and `subscription` name the two)
 */
const cutoffOnTopic = (topic: aws.sns.Topic, permission: string, subscription: string) => {
  allowCutoffFrom(permission, "sns.amazonaws.com", topic.arn);
  new aws.sns.TopicSubscription(subscription, {
    topic: topic.arn,
    protocol: "lambda",
    endpoint: cutoff.arn,
  });
};

cutoffOnTopic(cutoffTopic, "sns", "realtime-cutoff-lambda");
// AWS emails a confirmation link first; the alerts only arrive once it's clicked
new aws.sns.TopicSubscription("realtime-cutoff-email", {
  topic: cutoffTopic.arn,
  protocol: "email",
  endpoint: alertEmail,
});

for (const [metric, limit] of Object.entries(CUTOFF_LIMITS)) {
  new aws.cloudwatch.MetricAlarm(`realtime-${metric}`, {
    name: `lesas-realtime-${metric}`,
    alarmDescription: `Live cursors: ${metric} passed ${limit} in a minute, so the API keys were deleted`,
    namespace: "AWS/AppSync",
    metricName: metric,
    dimensions: { EventAPIId: api.apiId },
    statistic: metric === "ActiveConnections" ? "Maximum" : "Sum",
    period: 60,
    evaluationPeriods: 1,
    threshold: limit,
    comparisonOperator: "GreaterThanThreshold",
    treatMissingData: "notBreaching",
    alarmActions: [cutoffTopic.arn],
  });
}

const spendCheck = new aws.cloudwatch.EventRule("realtime-spend-check", {
  name: "lesas-realtime-spend-check",
  description: `Live cursors: has this month's traffic passed $${realtimeMonthlyCapUsd}?`,
  scheduleExpression: "rate(15 minutes)",
});
new aws.cloudwatch.EventTarget("realtime-spend-check", { rule: spendCheck.name, arn: cutoff.arn });
allowCutoffFrom("schedule", "events.amazonaws.com", spendCheck.arn);

// The backstop has its own topic, so the alarms' topic keeps its default policy
const budgetTopic = new aws.sns.Topic("realtime-budget", { name: "lesas-realtime-budget" });
new aws.sns.TopicPolicy("realtime-budget", {
  arn: budgetTopic.arn,
  policy: pulumi.jsonStringify({
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: { Service: "budgets.amazonaws.com" },
        Action: "sns:Publish",
        Resource: budgetTopic.arn,
        Condition: { StringEquals: { "aws:SourceAccount": aws.getCallerIdentityOutput().accountId } },
      },
    ],
  }),
});
cutoffOnTopic(budgetTopic, "budget", "realtime-budget-lambda");
costBudget("realtime", {
  name: BUDGETS.realtime,
  limitUsd: realtimeMonthlyCapUsd,
  alertOn: ["ACTUAL"],
  costFilters: [{ name: "Service", values: ["AWS AppSync"] }],
  topics: [budgetTopic.arn],
});
