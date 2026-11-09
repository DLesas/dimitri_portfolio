/**
 * Deeves, the site's chat agent: a table of the site's text in chunks with
 * their embeddings, searched by meaning through its vector index, and a table counting
 * each visitor's questions for the daily limit.
 *
 * Production deployments use both as the ask role (access/index.ts): their builds embed
 * new and changed chunks and delete removed ones, and their functions answer questions.
 * Each has its own OpenRouter key (config.ts), so visitors using up the query key's
 * spending limit can't stop a deploy.
 */
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsNative from "@pulumi/aws-native";
import { askRoleArn, openrouterBuildKey, openrouterQueryKey } from "./config";
import { dailyCountsTable } from "./dailyCounts";
import { ASK_CHUNKS_TABLE, ASK_LIMITS_TABLE, ASK_VECTOR_INDEX } from "./names";

// The standard AWS provider can't make vector indexes yet. AWS's Cloud Control API can,
// through this provider, in the stack's region.
const cloudControl = new awsNative.Provider("aws-native", {
  region: aws.config.requireRegion() as awsNative.Region,
});

// Each chunk of the site's text (`text`, whose hash is its `id`), its embedding (`vector`,
// made by `model`) and where it sits on the site (`path`). Vector indexes need a table
// that pays per request; idle, it costs only its storage.
const chunks = new awsNative.dynamodb.Table(
  "ask-chunks",
  {
    tableName: ASK_CHUNKS_TABLE,
    billingMode: "PAY_PER_REQUEST",
    keySchema: [{ attributeName: "id", keyType: "HASH" }],
    attributeDefinitions: [{ attributeName: "id", attributeType: "S" }],
    vectorIndexes: [
      {
        indexName: ASK_VECTOR_INDEX,
        vectorAttribute: { attributeName: "vector" },
        // Qwen3-Embedding-8B's full size. Fixed once the index exists: a model with
        // another size needs a new index.
        dimensions: 4096,
        distanceFunction: "COSINE",
        // A search returns only the matching chunks' ids: each deployment has their text
        projection: { projectionType: "KEYS_ONLY" },
      },
    ],
  },
  { provider: cloudControl }
);

// How many questions each visitor has asked today. Fixed capacity rather than paying per
// request, so a flood is throttled rather than billed: with the read counts' 10 and 10
// (blog.ts), still within DynamoDB's always-free 25 read and 25 write units. A question
// takes one write unit.
const limits = dailyCountsTable("ask-limits", {
  name: ASK_LIMITS_TABLE,
  billingMode: "PROVISIONED",
  readCapacity: 1,
  writeCapacity: 5,
});

/** What the assistant reads, in production builds and functions (site.ts) */
export const askEnv: Record<string, pulumi.Input<string>> = {
  ASK_ROLE_ARN: askRoleArn,
  // A Cloud Control table's id is its name
  ASK_CHUNKS_TABLE: chunks.id,
  ASK_VECTOR_INDEX: ASK_VECTOR_INDEX,
  ASK_LIMITS_TABLE: limits.name,
};

/** Its OpenRouter keys, kept as Sensitive variables (site.ts) */
export const askSecrets: Record<string, pulumi.Input<string>> = {
  OPENROUTER_BUILD_KEY: openrouterBuildKey,
  OPENROUTER_QUERY_KEY: openrouterQueryKey,
};
