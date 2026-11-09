/**
 * What the next production deploy will do to the site assistant's chunks, from this
 * checkout's text: which it will embed (new or changed) and delete (no longer on the
 * site), and about what embedding them will cost. Changes nothing. Run before merging a
 * pull request, signed in to AWS as for Pulumi (infra/pulumi.sh): `npm run ask:diff`.
 */
import { ASK_CHUNKS_TABLE } from "../../infra/names";
import { collectChunks } from "@/lib/ask/siteChunks";
import { chunkStore, listChunks } from "@/lib/ask/store";
import { describeSync, planSync } from "@/lib/ask/sync";

process.env.ASK_CHUNKS_TABLE ??= ASK_CHUNKS_TABLE;
const store = chunkStore();
if (!store) throw new Error("No chunk table");
console.log(describeSync(planSync(await collectChunks(), await listChunks(store))));
