/**
 * Brings the site assistant's chunk table in line with the site: runs before every build
 * (npm's prebuild, once chunks.ts has written this build's chunks), but changes the table
 * only for a production build. It embeds the very chunks the build bundles, before the
 * pages are built, so the embeddings post can be drawn from them (map.ts). If it can't,
 * the build fails, so no deploy goes live with text the assistant can't find.
 * `npm run ask:diff` shows beforehand what it will do.
 */
import { DEPLOYED_CHUNKS } from "@/lib/ask/deployedChunks";
import { chunkStore, listChunks } from "@/lib/ask/store";
import { applySync, describeSync, planSync } from "@/lib/ask/sync";

if (process.env.VERCEL_ENV !== "production") {
  console.log("Site assistant: not a production build, so its chunks are left as they are");
} else {
  try {
    const store = chunkStore();
    const key = process.env.OPENROUTER_BUILD_KEY;
    if (!store || !key) throw new Error("production builds need ASK_CHUNKS_TABLE and OPENROUTER_BUILD_KEY (infra/ask.ts)");
    const plan = planSync(DEPLOYED_CHUNKS, await listChunks(store));
    console.log(`Site assistant: ${describeSync(plan)}`);
    const tokens = await applySync(store, plan, key);
    console.log(`Site assistant: chunks up to date${tokens ? ` (${tokens.toLocaleString("en-GB")} tokens embedded)` : ""}`);
  } catch (error) {
    console.error("Site assistant: couldn't bring its chunks up to date, so this deploy stops here.", error);
    process.exit(1);
  }
}
