/*
 * Lambda: the live cursors' circuit breaker (Node.js runtime, AWS SDK v3 built in).
 *
 * The browser's API key is public, so anyone could flood the channel. A CloudWatch
 * alarm on the API's traffic (infra/index.ts) calls this through SNS, and it deletes
 * the API's keys: every connection, subscription and publish then fails, and the bill
 * stops growing. Restore with `npm run restore` in infra/, then redeploy the site.
 */
import { AppSyncClient, DeleteApiKeyCommand, ListApiKeysCommand } from "@aws-sdk/client-appsync";

const appsync = new AppSyncClient({});

export async function handler(event) {
  const apiId = process.env.API_ID;
  const alarms = (event?.Records ?? []).map((record) => {
    try {
      return JSON.parse(record.Sns.Message).AlarmName;
    } catch {
      return "unknown";
    }
  });

  const { apiKeys = [] } = await appsync.send(new ListApiKeysCommand({ apiId }));
  for (const key of apiKeys) {
    await appsync.send(new DeleteApiKeyCommand({ apiId, id: key.id }));
  }
  console.log(
    JSON.stringify({ cutoff: true, apiId, deletedKeys: apiKeys.length, alarms })
  );
}
