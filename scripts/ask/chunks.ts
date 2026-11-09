/**
 * Writes this build's chunks of the site's text to src/generated/askChunks.json, before
 * Next builds or serves the site (npm's prebuild and predev). The assistant searches and
 * cites only these (src/lib/ask/deployedChunks.ts), and the production sync embeds
 * exactly these (sync.ts).
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { collectChunks } from "@/lib/ask/siteChunks";

const file = path.join(process.cwd(), "src/generated/askChunks.json");
const chunks = await collectChunks();
await mkdir(path.dirname(file), { recursive: true });
await writeFile(file, `${JSON.stringify(chunks, null, 2)}\n`);
console.log(`Site assistant: ${chunks.length} chunks written to ${path.relative(process.cwd(), file)}`);
