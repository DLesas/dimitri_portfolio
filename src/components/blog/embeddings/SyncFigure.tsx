"use client";

import { useEffect, useRef, useState } from "react";
import { EMBEDDING_USD_PER_MILLION_TOKENS } from "@/lib/ask/config";
import { Caption, MAP, useSteps } from "./parts";

/** The passage edited, and the edit: what's at `at` (`from`) becomes `to` (scripts/ask/map.ts) */
const { point, text, at, from, to } = MAP.edited;
const EDITED_TEXT = text.slice(0, at) + to + text.slice(at + from.length);
/** The passage as shown: from after its headings, up to a little past the edit */
const BODY_START = text.indexOf("\n\n") + 2;
const SHOWN = {
  before: text.slice(BODY_START, at).replace(/\s+/g, " ").trimStart(),
  after: text.slice(at + from.length, at + from.length + 90).replace(/\s+/g, " "),
};
/** A few of the site's other passages, shown with it */
const OTHERS = MAP.rows.passages.slice(1).map((p) => p.point);
const STEPS = ["As deployed", "Edit one word", "Deploy"];
/** What embedding the one passage costs: about four characters a token */
const COST = `$${(((EDITED_TEXT.length / 4) * EMBEDDING_USD_PER_MILLION_TOKENS) / 1_000_000).toFixed(6)}`;

/** A passage's fingerprint, as the site makes its id: "c-" and the first 12 characters of the text's SHA-256 */
async function fingerprint(passage: string) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(passage));
  return `c-${[...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 12)}`;
}

/** One row of the comparison: a passage on the site, and the fingerprint the table holds for it */
function Row({ label, site, table, state }: { label: string; site: string; table: string; state: "same" | "embed" | "done" }) {
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-x-2.5 border-b border-default-200 py-2 text-[0.82rem] last:border-b-0 sm:gap-x-4">
      <span className="min-w-0 truncate text-foreground">{label}</span>
      <code key={site} className={`rounded px-1.5 font-mono text-[0.76rem] motion-safe:animate-fade-in ${state === "embed" ? "bg-primary/20 text-foreground" : "text-default-500"}`}>
        {site}
      </code>
      <span aria-hidden className={`w-6 text-center ${state === "embed" ? "text-[#f5a524]" : "text-[#17c964]"}`}>
        {state === "embed" ? "≠" : "="}
      </span>
      <code className="font-mono text-[0.76rem] text-default-500">
        {state === "embed" ? (
          <span className="line-through decoration-[#f31260]">{table}</span>
        ) : (
          <span key={table} className={state === "done" ? "rounded bg-primary/20 px-1.5 text-foreground motion-safe:animate-fade-in" : ""}>
            {table}
          </span>
        )}
      </code>
    </li>
  );
}

/** Editing one word of one passage, step by step: its fingerprint changes, it alone no longer matches the table, and a deploy embeds just that one */
export function SyncFigure({ title }: { title: string }) {
  const stage = useRef<HTMLDivElement>(null);
  const { step, buttons } = useSteps(stage, STEPS, 5500, 1);
  const deployed = MAP.points[point].id;
  const [edited, setEdited] = useState("c-…");
  useEffect(() => {
    let current = true;
    void fingerprint(EDITED_TEXT).then((id) => current && setEdited(id));
    return () => {
      current = false;
    };
  }, []);
  const site = step === 0 ? deployed : edited;
  const table = step === 2 ? edited : deployed;
  const state = step === 0 ? "same" : step === 1 ? "embed" : "done";

  return (
    <figure aria-label={title} className="my-10">
      <div ref={stage}>
        <p className="rounded-xl border border-default-200 bg-default-50 px-4 py-3 text-[0.84rem] leading-relaxed text-default-600 dark:bg-[#0c0c0f]">
          <strong className="font-semibold text-foreground">{MAP.points[point].label}.</strong> {SHOWN.before}
          <mark key={step === 0 ? "from" : "to"} className={`rounded px-1 text-foreground motion-safe:animate-fade-in ${step === 0 ? "bg-transparent" : "bg-primary/25"}`}>
            {step === 0 ? from : to}
          </mark>
          {SHOWN.after}…
        </p>
        <div className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] gap-x-2.5 pt-4 pb-1 text-[0.7rem] font-medium uppercase tracking-wide text-default-400 sm:gap-x-4">
          <span>Passage</span>
          <span>On the site</span>
          <span className="w-6" />
          <span>In the table</span>
        </div>
        <ul>
          <Row label={MAP.points[point].label} site={site} table={table} state={state} />
          {OTHERS.map((p) => (
            <Row key={p} label={MAP.points[p].label} site={MAP.points[p].id} table={MAP.points[p].id} state="same" />
          ))}
          <li className="pt-2 text-[0.8rem] text-default-400">…and {MAP.points.length - 1 - OTHERS.length} more, all matching.</li>
        </ul>
      </div>
      {buttons}
      <Caption>
        {step === 0 && (
          <>
            <strong className="font-semibold text-foreground">Nothing to do.</strong> Every passage&apos;s fingerprint on the site is already in the table, so a deploy embeds nothing. (This one is worked out in your browser, from the passage&apos;s text, and matches the real table.)
          </>
        )}
        {step === 1 && (
          <>
            <strong className="font-semibold text-foreground">One word changes, so its fingerprint does.</strong> The new fingerprint isn&apos;t in the table, and the old one is no longer on the site. Every other passage still matches.
          </>
        )}
        {step === 2 && (
          <>
            <strong className="font-semibold text-foreground">1 to embed, {MAP.points.length - 1} unchanged, 1 to delete.</strong> The deploy embeds the one changed passage (about {COST}) and deletes its old entry.
          </>
        )}
      </Caption>
    </figure>
  );
}
