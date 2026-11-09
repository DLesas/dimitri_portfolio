import "server-only";
import { SearchVectorsCommand } from "@aws-sdk/client-dynamodb";
import { embed } from "ai";
import { QUERY_INSTRUCTION, SEARCH_CANDIDATES, SEARCH_RESULTS } from "./config";
import { chunkById, DEPLOYED_CHUNKS } from "./deployedChunks";
import { fuseRankings, keywordIndex, keywordSearch } from "./keyword";
import { embeddingModel } from "./models";
import type { SiteChunk } from "./pageChunks";
import type { ChunkStore } from "./store";

const keywords = keywordIndex(DEPLOYED_CHUNKS);

/**
 * The chunks of this deployment that best answer `query`: searched by meaning (the chunk
 * table's vector index, with the question embedded on `apiKey`) and by keyword, and the
 * two rankings merged. If the search by meaning fails, the keywords still answer.
 */
export async function searchSite(query: string, store: ChunkStore, apiKey: string): Promise<SiteChunk[]> {
  const byMeaning = await meaningSearch(query, store, apiKey).catch((error) => {
    console.error("Site assistant: the search by meaning failed, so this one used keywords only", error);
    return [];
  });
  const byKeyword = keywordSearch(keywords, query, SEARCH_CANDIDATES.keyword);
  return fuseRankings([byMeaning, byKeyword])
    .slice(0, SEARCH_RESULTS)
    .map((id) => chunkById.get(id))
    .filter((c) => c !== undefined);
}

/** The ids of the chunks nearest `query` in meaning, nearest first, that this deployment has */
async function meaningSearch(query: string, { dynamo, table, vectorIndex }: ChunkStore, apiKey: string) {
  const { embedding } = await embed({ model: embeddingModel(apiKey), value: QUERY_INSTRUCTION + query, maxRetries: 2 });
  const { SearchResults } = await dynamo.send(
    new SearchVectorsCommand({
      TableName: table,
      IndexName: vectorIndex,
      SearchVector: embedding.map((n) => ({ N: String(n) })),
      TopK: SEARCH_CANDIDATES.meaning,
    })
  );
  return (SearchResults ?? []).map((result) => result.Item?.id?.S ?? "").filter((id) => chunkById.has(id));
}
