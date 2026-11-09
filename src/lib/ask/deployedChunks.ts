import "server-only";
// Written before each build and dev server (scripts/ask/chunks.ts), and not committed
import chunks from "@/generated/askChunks.json";
import type { SiteChunk } from "./pageChunks";

/**
 * This deployment's chunks of the site's text: all the assistant may find and cite. Its
 * searches drop any other chunk the table holds (another deployment's, mid-deploy), and
 * earlier answers' passages are taken from here, never from what the browser sends back.
 */
export const DEPLOYED_CHUNKS: SiteChunk[] = chunks;

export const chunkById = new Map(DEPLOYED_CHUNKS.map((c) => [c.id, c]));
