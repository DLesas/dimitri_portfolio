/**
 * Cloud resources for lesas.dev, managed with Pulumi (state in S3, see Pulumi.yaml).
 *
 * - An AppSync Events API carrying the home page's live cursors
 * - The Vercel environment variables the site connects with
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

// ---- Cost guard ----

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
    subscriberEmailAddresses: [config.require("alertEmail")],
  })),
});

export const realtimeHttpHost = httpHost;
export const realtimeWsHost = realtimeHost;
export const apiKeyExpires = apiKey.expires;
