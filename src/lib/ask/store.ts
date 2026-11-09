import "server-only";
import { BatchWriteItemCommand, DynamoDBClient, ScanCommand, type AttributeValue, type WriteRequest } from "@aws-sdk/client-dynamodb";
import { awsConfig } from "@/lib/aws";

/**
 * The assistant's chunk table (infra/ask.ts): each chunk's text, path, embedding and the
 * model that made it, keyed by the chunk's id. Production builds and functions reach it
 * as the ask role; tools run on your machine use your own AWS sign-in.
 */
export interface ChunkStore {
  dynamo: DynamoDBClient;
  table: string;
  /** Its vector index, which searches it by meaning */
  vectorIndex: string;
}

/** The table, or null where the site has none (ASK_CHUNKS_TABLE and the rest, set in infra/ask.ts) */
export function chunkStore(): ChunkStore | null {
  const table = process.env.ASK_CHUNKS_TABLE;
  const vectorIndex = process.env.ASK_VECTOR_INDEX ?? "";
  return table ? { dynamo: new DynamoDBClient(awsConfig(process.env.ASK_ROLE_ARN)), table, vectorIndex } : null;
}

/** What the table holds about a chunk, besides its text and embedding */
export interface StoredChunk {
  id: string;
  /** The embedding model that made its vector */
  model: string;
  /** Where it sits on the site, as one line */
  path: string;
}

/** Every chunk in the table */
export async function listChunks({ dynamo, table }: ChunkStore): Promise<StoredChunk[]> {
  const chunks: StoredChunk[] = [];
  let start: Record<string, AttributeValue> | undefined;
  do {
    const page = await dynamo.send(
      new ScanCommand({
        TableName: table,
        ProjectionExpression: "id, #model, #path",
        ExpressionAttributeNames: { "#model": "model", "#path": "path" },
        ExclusiveStartKey: start,
      })
    );
    for (const item of page.Items ?? []) {
      chunks.push({ id: item.id.S ?? "", model: item.model?.S ?? "", path: item.path?.S ?? "" });
    }
    start = page.LastEvaluatedKey;
  } while (start);
  return chunks;
}

/** DynamoDB's most writes in one request */
const BATCH = 25;
/** Tries at a batch DynamoDB keeps leaving partly unwritten (it does under load) */
const BATCH_ATTEMPTS = 8;

/** Makes `writes` (puts and deletes), a batch at a time, retrying whatever DynamoDB leaves */
export async function writeChunks({ dynamo, table }: ChunkStore, writes: WriteRequest[]) {
  for (let i = 0; i < writes.length; i += BATCH) {
    let left = writes.slice(i, i + BATCH);
    for (let attempt = 1; left.length; attempt++) {
      if (attempt > BATCH_ATTEMPTS) throw new Error(`DynamoDB left ${left.length} writes undone after ${BATCH_ATTEMPTS} tries`);
      if (attempt > 1) await new Promise((resolve) => setTimeout(resolve, 50 * 2 ** attempt));
      const { UnprocessedItems } = await dynamo.send(new BatchWriteItemCommand({ RequestItems: { [table]: left } }));
      left = UnprocessedItems?.[table] ?? [];
    }
  }
}
