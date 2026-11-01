/**
 * Cloud resources for lesas.dev, managed with Pulumi (state in S3, see Pulumi.yaml).
 *
 * - An AppSync Events API carrying the home page's live cursors
 * - The Vercel environment variables the site connects with
 * - An automatic cutoff for that API if its traffic looks like abuse
 * - A monthly cost alert for the AWS account
 *
 * Commands (from this folder) are the npm scripts in package.json. They read the Vercel
 * token and the Pulumi passphrase from ~/.config/lesas/, outside the repo.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as vercel from "@pulumiverse/vercel";

const config = new pulumi.Config();

// ---- Live cursors: AppSync Events ----

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
// ignored, so deploys don't replace it; `npm run renew-key` swaps in a fresh one.
const YEAR_MS = 364 * 24 * 60 * 60 * 1000;
const apiKey = new aws.appsync.ApiKey(
  "browser",
  {
    apiId: api.apiId,
    description: "Public key the site's visitors connect with (lesas.dev live cursors)",
    expires: new Date(Date.now() + YEAR_MS).toISOString().replace(/\.\d{3}Z$/, "Z"),
  },
  { ignoreChanges: ["expires"] }
);

const httpHost = api.dns.apply((dns) => dns["HTTP"]);
const realtimeHost = api.dns.apply((dns) => dns["REALTIME"]);

// ---- Vercel: what the site connects with ----

// NEXT_PUBLIC_ values are built into the site, so a changed value needs a redeploy.
// The team comes from the provider's config (vercel:team).
const project = vercel.getProjectOutput({ name: config.require("vercelProject") });
const siteEnv: Record<string, pulumi.Input<string>> = {
  NEXT_PUBLIC_REALTIME_HTTP_HOST: httpHost,
  NEXT_PUBLIC_REALTIME_WS_HOST: realtimeHost,
  NEXT_PUBLIC_REALTIME_API_KEY: apiKey.key,
};
for (const [key, value] of Object.entries(siteEnv)) {
  new vercel.ProjectEnvironmentVariable(key, {
    projectId: project.id,
    key,
    value,
    // Public by design: the browser needs them
    sensitive: false,
    targets: ["production", "preview", "development"],
  });
}

// ---- Cost guard: automatic cutoff ----

// The API key is public, so the channel can be flooded. AppSync reports traffic every
// minute; if it passes any of these limits (far above real use: a handful of visitors
// sends a few thousand messages a minute), a Lambda deletes the API's keys, which stops
// all traffic within a few minutes, and an email says so. `npm run restore` brings a
// new key back, after which the site needs a redeploy.
const CUTOFF_LIMITS = {
  InboundMessages: 30_000, // messages published per minute
  OutboundMessages: 200_000, // messages delivered per minute (published × subscribers)
  ActiveConnections: 300, // open connections
};
const alertEmail = config.require("alertEmail");

const cutoffRole = new aws.iam.Role("realtime-cutoff", {
  assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({ Service: "lambda.amazonaws.com" }),
});
new aws.iam.RolePolicyAttachment("realtime-cutoff-logs", {
  role: cutoffRole.name,
  policyArn: aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole,
});
new aws.iam.RolePolicy("realtime-cutoff-keys", {
  role: cutoffRole.id,
  // API key actions are authorised against arn:…:/v1/apis/<id>/apikeys[/<key>], not the
  // API's own ARN (arn:…:apis/<id>)
  policy: api.apiArn.apply((arn) => {
    const keys = `${arn.replace(":apis/", ":/v1/apis/")}/apikeys`;
    return JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Action: ["appsync:ListApiKeys", "appsync:DeleteApiKey"],
          Resource: [keys, `${keys}/*`],
        },
      ],
    });
  }),
});

const cutoffLogs = new aws.cloudwatch.LogGroup("realtime-cutoff", {
  name: "/aws/lambda/lesas-realtime-cutoff",
  retentionInDays: 30,
});
const cutoff = new aws.lambda.Function(
  "realtime-cutoff",
  {
    name: "lesas-realtime-cutoff",
    description: "Deletes the live cursors' API keys when their traffic looks like abuse",
    runtime: aws.lambda.Runtime.NodeJS22dX,
    handler: "cutoff.handler",
    code: new pulumi.asset.AssetArchive({
      "cutoff.mjs": new pulumi.asset.FileAsset(path.join(__dirname, "handlers", "cutoff.mjs")),
    }),
    role: cutoffRole.arn,
    memorySize: 128,
    timeout: 15,
    environment: { variables: { API_ID: api.apiId } },
  },
  { dependsOn: [cutoffLogs] }
);

const cutoffTopic = new aws.sns.Topic("realtime-cutoff", { name: "lesas-realtime-cutoff" });
new aws.lambda.Permission("realtime-cutoff-from-sns", {
  action: "lambda:InvokeFunction",
  function: cutoff.name,
  principal: "sns.amazonaws.com",
  sourceArn: cutoffTopic.arn,
});
new aws.sns.TopicSubscription("realtime-cutoff-lambda", {
  topic: cutoffTopic.arn,
  protocol: "lambda",
  endpoint: cutoff.arn,
});
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

// ---- Cost guard: monthly budget ----

// Account-wide: emails when this month's actual or forecast spend passes the limit
new aws.budgets.Budget("monthly-cost", {
  name: "monthly-cost",
  budgetType: "COST",
  limitAmount: config.require("monthlyBudgetUsd"),
  limitUnit: "USD",
  timeUnit: "MONTHLY",
  notifications: (["ACTUAL", "FORECASTED"] as const).map((notificationType) => ({
    notificationType,
    comparisonOperator: "GREATER_THAN",
    threshold: 100,
    thresholdType: "PERCENTAGE",
    subscriberEmailAddresses: [alertEmail],
  })),
});

export const realtimeHttpHost = httpHost;
export const realtimeWsHost = realtimeHost;
export const apiKeyExpires = apiKey.expires;
