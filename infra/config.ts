/**
 * Every setting this stack reads, from its config (Pulumi.<stack>.yaml) and from the
 * access stack. The rest of the program imports them from here.
 */
import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();

/** Where alerts go: the budgets and the live cursors' cutoff */
export const alertEmail = config.require("alertEmail");

/** The account-wide monthly budget, in USD */
export const monthlyBudgetUsd = config.require("monthlyBudgetUsd");
/** What the live cursors may cost in a month, in USD, before the cutoff */
export const realtimeMonthlyCapUsd = config.require("realtimeMonthlyCapUsd");

/** The Vercel project (its team is the provider's own vercel:team setting) */
export const vercelProject = config.require("vercelProject");
/** The GitHub repository the Vercel project builds from, as owner/name */
export const githubRepo = config.require("githubRepo");

/** The lesas.dev zone on Cloudflare (dns.ts) */
export const cloudflareZoneId = config.require("cloudflareZoneId");

/**
 * The identity and access stack (access/): the roles this stack's resources run as. It's
 * deployed by hand, so CI, which deploys this stack, can't change IAM.
 */
const access = new pulumi.StackReference(`organization/lesas-access/${pulumi.getStack()}`);
// Stack outputs come back untyped; the ones read here are all ARNs
const accessOutput = (name: string) => access.requireOutput(name) as pulumi.Output<string>;

/** The role the cutoff Lambda runs as */
export const cutoffRoleArn = accessOutput("cutoffRoleArn");
/** The role the contact form's Vercel functions assume */
export const contactRoleArn = accessOutput("contactRoleArn");
/** The role the blog's read counts (Vercel functions) assume */
export const readsRoleArn = accessOutput("readsRoleArn");
