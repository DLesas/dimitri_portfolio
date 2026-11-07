/**
 * Read counts for blog posts: one DynamoDB table, which the site's Vercel functions write
 * and read (src/app/api/reads/route.ts) with a role made in access/index.ts. Like the
 * contact form's, only production deployments can assume it, so the counts are switched
 * on for production only: previews and local development show none.
 */
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { readsRoleArn } from "./config";
import { BLOG_READS_TABLE } from "./names";

// Each post's count, plus short-lived items that hold back repeat and runaway counting
// (the route sets their `expires`, and DynamoDB deletes them a while after)
const reads = new aws.dynamodb.Table("blog-reads", {
  name: BLOG_READS_TABLE,
  billingMode: "PAY_PER_REQUEST",
  hashKey: "id",
  attributes: [{ name: "id", type: "S" }],
  ttl: { attributeName: "expires", enabled: true },
});

/** What the read counts read, set for production deployments only (site.ts) */
export const readsEnv: Record<string, pulumi.Input<string>> = {
  BLOG_READS_TABLE: reads.name,
  BLOG_READS_ROLE_ARN: readsRoleArn,
};
