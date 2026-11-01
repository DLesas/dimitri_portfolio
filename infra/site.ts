/**
 * The Vercel project and its domains (imported as they were set up in the dashboard),
 * its firewall, and the environment variables the site reads.
 */
import * as pulumi from "@pulumi/pulumi";
import * as vercel from "@pulumiverse/vercel";
import { vercelProject } from "./config";
import { realtimeEnv } from "./realtime";
import { contactEnv } from "./email";

export const site = new vercel.Project(
  "site",
  {
    name: vercelProject,
    framework: "nextjs",
    nodeVersion: "22.x",
    gitRepository: { type: "github", repo: "DLesas/dimitri_portfolio", productionBranch: "main" },
    gitForkProtection: true,
    autoAssignCustomDomains: true,
    automaticallyExposeSystemEnvironmentVariables: true,
    buildMachineType: "basic",
    prioritiseProductionBuilds: true,
    resourceConfig: { fluid: true, functionDefaultRegions: ["iad1"] },
    // Functions can swap Vercel OIDC tokens for AWS credentials (see email.ts)
    oidcTokenConfig: { issuerMode: "team" },
    vercelAuthentication: { deploymentType: "standard_protection" },
  },
  { protect: true }
);

new vercel.ProjectDomain("lesas-dev", { projectId: site.id, domain: "lesas.dev" }, { protect: true });
new vercel.ProjectDomain(
  "www-lesas-dev",
  { projectId: site.id, domain: "www.lesas.dev", redirect: "lesas.dev", redirectStatusCode: 307 },
  { protect: true }
);

// Each contact form message is a real email, so a script could fill the inbox and the
// SES bill: each IP gets a few, then a 429 until the window ends. (Hobby allows one
// rate limit rule per project.)
new vercel.FirewallConfig("firewall", {
  projectId: site.id,
  rules: {
    rules: [
      {
        name: "Contact form",
        description: "5 messages per IP every 10 minutes",
        conditionGroups: [
          {
            conditions: [
              { type: "path", op: "eq", value: "/api/contact" },
              { type: "method", op: "eq", value: "POST" },
            ],
          },
        ],
        action: {
          action: "rate_limit",
          rateLimit: { algo: "fixed_window", window: 600, limit: 5, keys: ["ip"], action: "rate_limit" },
        },
      },
    ],
  },
});

// Not secrets: the realtime values ship in the browser bundle, and the contact form's
// role can only be assumed from this project's production deployments
const siteEnv: Record<string, pulumi.Input<string>> = { ...realtimeEnv, ...contactEnv };
for (const [key, value] of Object.entries(siteEnv)) {
  new vercel.ProjectEnvironmentVariable(key, {
    projectId: site.id,
    key,
    value,
    sensitive: false,
    targets: ["production", "preview", "development"],
  });
}
