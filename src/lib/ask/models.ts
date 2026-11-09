import "server-only";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { EMBEDDING_MODEL } from "./config";

/**
 * The embedding model, through OpenRouter, billed to `apiKey`: the build key for the
 * site's text as it deploys, or the query key for visitors' questions (infra/ask.ts).
 * Both use the same model, so questions and text are compared like for like.
 */
export const embeddingModel = (apiKey: string) => createOpenRouter({ apiKey }).textEmbeddingModel(EMBEDDING_MODEL);
