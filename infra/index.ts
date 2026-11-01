/**
 * Cloud resources for lesas.dev, managed with Pulumi (state in S3, see Pulumi.yaml). CI
 * previews this stack on pull requests and deploys it on merge to main
 * (.github/workflows/infra.yml); the roles it runs as come from access/, deployed by hand.
 *
 * - realtime.ts: the home page's live cursors (AppSync Events) and their cutoff
 * - email.ts: SES for the contact form, the DynamoDB table behind its daily limit, and
 *   keyless sending from Vercel
 * - site.ts: the Vercel project, its domains, firewall and environment variables
 * - dns.ts: the lesas.dev records on Cloudflare
 * - budget.ts: a monthly cost alert for the AWS account (and the budget helper
 *   realtime.ts uses too)
 * - config.ts: every setting read (Pulumi.prod.yaml and the access stack's outputs)
 * - names.ts: names this stack and access/ must agree on
 *
 * Commands (from this folder) are the npm scripts in package.json. They read the Vercel
 * and Cloudflare tokens and the Pulumi passphrase from ~/.config/lesas/, outside the repo
 * (pulumi.sh).
 */
import "./budget";
import { apiKey, httpHost, realtimeHost } from "./realtime";
import "./email";
import "./site";
import "./dns";

export const realtimeHttpHost = httpHost;
export const realtimeWsHost = realtimeHost;
export const apiKeyExpires = apiKey.expires;
