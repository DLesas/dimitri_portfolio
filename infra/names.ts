/**
 * Names both stacks must agree on: this one creates the resources, and the access stack
 * (access/index.ts) grants permissions on them by name. Changing one means deploying
 * access/ too, by hand: CI only deploys this stack.
 *
 * Plain constants only, with no @pulumi imports: access/ imports this file as ../names,
 * and an import here would load a second copy of @pulumi/pulumi from this folder's
 * node_modules into that stack.
 */

/** This project's name (Pulumi.yaml), under which its state lives. Also in package.json's renew-key URN. */
export const PROJECT = "lesas-infra";

// ---- The contact form (email.ts) ----

/** The SES domain the contact form sends from */
export const EMAIL_DOMAIN = "lesas.dev";
/** The address it sends as */
export const FROM_ADDRESS = "contact@lesas.dev";
/** The one inbox it sends to */
export const INBOX = "dlesas@hotmail.com";
/** The DynamoDB table counting each visitor's messages for the daily limit */
export const CONTACT_LIMITS_TABLE = "lesas-contact-limits";

// ---- Blog read counts (blog.ts) ----

/** The DynamoDB table counting each blog post's reads */
export const BLOG_READS_TABLE = "lesas-blog-reads";

// ---- Dimitri's assistant (ask.ts) ----

/** The DynamoDB table of the site's text in chunks, with their embeddings */
export const ASK_CHUNKS_TABLE = "lesas-ask-chunks";
/** The chunk table's vector index, which searches it by meaning */
export const ASK_VECTOR_INDEX = "by-meaning";
/** The DynamoDB table counting each visitor's questions for the daily limit */
export const ASK_LIMITS_TABLE = "lesas-ask-limits";

// ---- The live cursors (realtime.ts) and costs (budget.ts) ----

/** The cutoff's SNS topic and Lambda function (and its log group, /aws/lambda/<this>) */
export const CUTOFF = "lesas-realtime-cutoff";

/** The cost budgets: the whole account's, and the live cursors' AppSync charges */
export const BUDGETS = { monthly: "monthly-cost", realtime: "lesas-realtime" } as const;
