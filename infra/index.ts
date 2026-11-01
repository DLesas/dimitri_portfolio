/**
 * Cloud resources for lesas.dev, managed with Pulumi (state in S3, see Pulumi.yaml).
 *
 * - realtime.ts: the home page's live cursors (AppSync Events) and their cutoff
 * - email.ts: SES for the contact form, and keyless sending from Vercel
 * - site.ts: the Vercel project, its domains and environment variables
 * - budget.ts: a monthly cost alert for the AWS account
 *
 * Commands (from this folder) are the npm scripts in package.json. They read the Vercel
 * token and the Pulumi passphrase from ~/.config/lesas/, outside the repo.
 */
import "./budget";
import { apiKey, httpHost, realtimeHost } from "./realtime";
import "./email";
import "./site";

export const realtimeHttpHost = httpHost;
export const realtimeWsHost = realtimeHost;
export const apiKeyExpires = apiKey.expires;
