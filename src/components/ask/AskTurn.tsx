import { Fragment, useId, useState, type CSSProperties, type ReactNode } from "react";
import {
  LuArrowRight,
  LuCheck,
  LuChevronRight,
  LuCircleAlert,
  LuClock,
  LuCornerDownRight,
  LuFileText,
  LuLoaderCircle,
  LuMail,
} from "react-icons/lu";
import { REPLIES, type Reply } from "@/lib/ask/replies";
import { SITE_URL } from "@/lib/site";
import { AnswerText } from "./AnswerText";
import { Kbd } from "./Kbd";
import { StopIcon } from "./StopIcon";
import type { Passage, Search, readAnswer } from "./chat";
import { PassageLink } from "./PassageLink";

/** A result row under an answer: a passage it cites, or a page it links to */
export type Row = { key: string; href: string } & ({ n: number; path: string[] } | { label: string });

/** One question and what became of it, as AskPalette works it out */
export interface Turn {
  id: string;
  question: string;
  answer: ReturnType<typeof readAnswer>;
  /** Its answer is being written */
  live: boolean;
  /** Why it wasn't answered in full, if it wasn't */
  why?: "stopped" | Reply;
  /** How long it thought before writing, in seconds, once it has */
  thought?: number;
  /** Its sources, then its pages, once it's done */
  rows: Row[];
}

interface AskTurnProps {
  turn: Turn;
  passages: Map<number, Passage>;
  /** The highlighted row's key, here or in another turn */
  highlighted?: string;
  /** ↵ would open the highlighted row, so it says so */
  enterOpens: boolean;
}

const SITE_HOST = new URL(SITE_URL).host;

/** The column the icons sit in, ahead of the question, the status lines and the answer */
const ICON = "inline-grid h-5 w-[18px] flex-none place-items-center";

/** One question in the palette: its thinking and searches, its answer, then its sources */
export function AskTurn({ turn, passages, highlighted, enterOpens }: AskTurnProps) {
  const { answer, live, why } = turn;
  // Thinking is open while it's the only thing to read, unless the visitor has chosen
  const [chosenOpen, setChosenOpen] = useState<boolean>();
  const thinkOpen = chosenOpen ?? !answer.text;
  const thinking = live && !answer.text;
  const sources = turn.rows.filter((row) => "n" in row);
  const pages = turn.rows.filter((row) => "label" in row);

  return (
    <section data-turn={turn.id} className="not-first:mt-[18px] not-first:border-t not-first:border-foreground/10 not-first:pt-4 motion-safe:animate-rise">
      <div className="flex items-start gap-3">
        <span className="inline-grid h-[22px] w-[18px] flex-none place-items-center text-default-400">
          <LuCornerDownRight size={16} aria-hidden="true" />
        </span>
        <p className="text-[15px] leading-[22px] font-semibold wrap-anywhere whitespace-pre-line max-md:text-base">{turn.question}</p>
      </div>

      <div className="not-empty:mt-1.5">
        {(thinking || answer.reasoning) && (
          <Thinking
            text={answer.reasoning}
            live={thinking}
            label={thinking ? "Thinking" : turn.thought ? `Thought for ${turn.thought}s` : "Thought"}
            open={thinkOpen}
            onToggle={() => setChosenOpen(!thinkOpen)}
          />
        )}
        {answer.searches.map((search, i) => (
          <SearchLine key={i} search={search} live={live} />
        ))}
      </div>

      {answer.text && (
        <div className="mt-3 ml-[30px] text-[15px] leading-[1.65] wrap-break-word *:motion-safe:animate-rise [&>*+*]:mt-2.5 max-md:text-base">
          <AnswerText text={answer.text} passages={passages} end={live && answer.writing ? "caret" : why === "stopped" ? "cut" : undefined} />
        </div>
      )}

      <div className="empty:hidden">
        {why && <Note why={why} answered={!!answer.text} />}
        {sources.length > 0 && <Rows label="Sources" rows={sources} highlighted={highlighted} enterOpens={enterOpens} />}
        {pages.length > 0 && <Rows label={pages.length > 1 ? "Pages" : "Page"} rows={pages} highlighted={highlighted} enterOpens={enterOpens} />}
      </div>
    </section>
  );
}

/** A quiet line about the answer: a search, or why it stopped */
function StatusLine({ icon, active, className = "", children }: { icon: ReactNode; active?: boolean; className?: string; children: ReactNode }) {
  return (
    <div className={`mt-1 flex items-start gap-3 text-[13px] leading-5 text-default-500 motion-safe:animate-fade-in ${className}`}>
      <span className={`${ICON} ${active ? "text-primary-text" : "text-default-400"}`} aria-hidden="true">
        {icon}
      </span>
      <span>{children}</span>
    </div>
  );
}

function Thinking({ text, live, label, open, onToggle }: { text: string; live: boolean; label: string; open: boolean; onToggle: () => void }) {
  const id = useId();
  return (
    <div className="motion-safe:animate-fade-in">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={onToggle}
        className="flex cursor-pointer items-center gap-3 rounded-md pr-1.5 text-[13px] leading-5 text-default-500 transition-colors hover:text-foreground"
      >
        <span className={ICON}>
          <LuChevronRight
            size={14}
            aria-hidden="true"
            className={`transition-transform duration-200 ease-out-expo motion-reduce:transition-none ${open ? "rotate-90" : ""}`}
          />
        </span>
        <span>{label}</span>
        {live && <span className="size-1.5 rounded-full bg-primary motion-safe:animate-pulse" aria-hidden="true" />}
      </button>
      {/* Folds by its rows' height, so it opens and closes smoothly */}
      <div
        id={id}
        inert={!open}
        className={`grid transition-[grid-template-rows,opacity] duration-240 ease-out-expo motion-reduce:transition-none ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
      >
        <div className="min-h-0 overflow-hidden">
          <p className="mt-0.5 mb-1 ml-[30px] text-[13px] leading-[1.6] text-default-500 wrap-anywhere whitespace-pre-line max-md:text-sm">{text}</p>
        </div>
      </div>
    </div>
  );
}

function SearchLine({ search, live }: { search: Search; live: boolean }) {
  const searching = live && search.state === "searching";
  const query = search.query ? <span className="text-foreground">“{search.query}”</span> : null;
  const found = search.found;
  if (searching) {
    return (
      <StatusLine icon={<LuLoaderCircle size={14} className="animate-spin" />} active>
        Searching the site{query && <> for {query}</>}
      </StatusLine>
    );
  }
  if (search.state === "failed") {
    return <StatusLine icon={<LuCircleAlert size={14} />}>Couldn’t search the site{query && <> for {query}</>}</StatusLine>;
  }
  return (
    <StatusLine icon={<LuCheck size={14} />}>
      Searched the site{query && <> for {query}</>}
      {found !== undefined && ` · found ${found} passage${found === 1 ? "" : "s"}`}
    </StatusLine>
  );
}

/** Why a question wasn't answered in full */
function Note({ why, answered }: { why: "stopped" | Reply; answered: boolean }) {
  const limit = why === REPLIES.daily ? "today’s" : why === REPLIES.monthly ? "this month’s" : undefined;
  if (why === "stopped") {
    return (
      <StatusLine icon={<StopIcon />} className="mt-2.5">
        {answered ? "Stopped. Ask again whenever you like." : "Stopped before answering. Ask again whenever you like."}
      </StatusLine>
    );
  }
  return (
    <StatusLine icon={limit ? <LuClock size={14} /> : <LuCircleAlert size={14} />} className="mt-2.5">
      {limit ? `Not answered: ${limit} limit is reached.` : why}
    </StatusLine>
  );
}

function Rows({ label, rows, highlighted, enterOpens }: { label: string; rows: Row[]; highlighted?: string; enterOpens: boolean }) {
  const id = useId();
  return (
    <div className="mt-4 motion-safe:animate-rise">
      <p id={id} className="mb-1 text-[11px] font-semibold tracking-[0.07em] text-default-500 uppercase">
        {label}
      </p>
      <ul aria-labelledby={id} className="-mx-2">
        {rows.map((row, i) => {
          const lit = row.key === highlighted;
          const quiet = lit ? "text-default-600" : "text-default-500";
          return (
            <li key={row.key}>
              <PassageLink
                href={row.href}
                data-row={row.key}
                data-n={"n" in row ? row.n : undefined}
                aria-label={"n" in row ? `Source ${row.n}: ${row.path.join(", ")}` : `${row.label} page`}
                style={{ "--i": i } as CSSProperties}
                className={`flex h-10 items-center gap-[11px] rounded-[10px] pr-2.5 pl-[7px] text-[13.5px] leading-5 no-underline outline-none transition-colors duration-120 focus-visible:shadow-[inset_0_0_0_2px_hsl(var(--heroui-primary))] data-pressed:bg-primary/10 motion-safe:animate-rise motion-safe:[animation-delay:calc(var(--i)*45ms+60ms)] max-md:h-auto max-md:min-h-[52px] max-md:py-[7px] ${lit ? "bg-default-100" : ""}`}
              >
                {"n" in row ? <SourceRow n={row.n} path={row.path} quiet={quiet} /> : <PageRow label={row.label} href={row.href} quiet={quiet} />}
                {/* "Open ↵" when ↵ would open it (keyboards only, so not on phones) */}
                {lit && enterOpens && (
                  <span className={`hidden flex-none items-center gap-1.5 text-xs md:inline-flex ${quiet}`} aria-hidden="true">
                    Open<Kbd>↵</Kbd>
                  </span>
                )}
                <span
                  aria-hidden="true"
                  className={`grid flex-none transition-[translate,color] duration-160 ease-out-expo ${lit ? "translate-x-0.5 text-foreground" : "text-default-400"}`}
                >
                  <LuArrowRight size={15} />
                </span>
              </PassageLink>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const NUMBER =
  "inline-grid h-5 min-w-5 flex-none place-items-center rounded-full bg-primary/10 text-[11.5px] leading-none font-semibold text-primary-text tabular-nums dark:bg-primary/20";
/** The row's words: one line, or two on phones (where it's above, the passage below) */
const PATH = "flex min-w-0 flex-1 items-baseline max-md:flex-col max-md:items-stretch";
const LEAF = "min-w-0 flex-[0_1_auto] truncate max-md:whitespace-normal";
const SEPARATOR = "mx-1.5 flex-none text-default-400";

/** A passage's number and place on the site: the crumbs give way first, keeping its own name */
function SourceRow({ n, path, quiet }: { n: number; path: string[]; quiet: string }) {
  const crumbs = path.slice(0, -1);
  return (
    <>
      <span className={`${NUMBER} px-1.5`}>{n}</span>
      <span className={PATH} aria-hidden="true">
        {crumbs.length > 0 && (
          <>
            <span className={`min-w-0 flex-[0_100_auto] truncate max-md:text-xs max-md:leading-[17px] ${quiet}`}>
              {crumbs.map((crumb, i) => (
                <Fragment key={i}>
                  {i > 0 && <span className={SEPARATOR}>›</span>}
                  {crumb}
                </Fragment>
              ))}
            </span>
            <span className={`${SEPARATOR} max-md:hidden`}>›</span>
          </>
        )}
        <span className={LEAF}>{path.at(-1)}</span>
      </span>
    </>
  );
}

function PageRow({ label, href, quiet }: { label: string; href: string; quiet: string }) {
  return (
    <>
      <span className={NUMBER} aria-hidden="true">
        {href.startsWith("/contact") ? <LuMail size={12} /> : <LuFileText size={12} />}
      </span>
      <span className={PATH} aria-hidden="true">
        <span className={LEAF}>{label}</span>
        <span className={`ml-2.5 flex-none text-[12.5px] max-md:ml-0 max-md:text-xs max-md:leading-[17px] ${quiet}`}>
          {SITE_HOST}
          {href}
        </span>
      </span>
    </>
  );
}
