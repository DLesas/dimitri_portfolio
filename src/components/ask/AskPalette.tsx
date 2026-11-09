"use client";

import { useChat } from "@ai-sdk/react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { LuArrowUp, LuClock, LuPlus, LuSearch } from "react-icons/lu";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { AskMessage } from "@/lib/ask/agent";
import { MAX_QUESTION_CHARS } from "@/lib/ask/config";
import { AskTurn, type Row, type Turn } from "./AskTurn";
import {
  askChat,
  checkLimit,
  citedPassages,
  currentLimit,
  passagesByNumber,
  readAnswer,
  startOver,
  stopAnswer,
  subscribeLimit,
  thoughtFor,
  unansweredWhy,
} from "./chat";
import { Kbd } from "./Kbd";
import { FollowContext, openPage } from "./PassageLink";
import { StopIcon } from "./StopIcon";

/** The question's length shows from here on */
const COUNT_FROM = 400;

/** Phones get the palette full screen, with fewer words (AskPalette.module.css) */
const PHONE = "(max-width: 767px)";
const isPhone = () => matchMedia(PHONE).matches;
function subscribePhone(onChange: () => void) {
  const query = matchMedia(PHONE);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

const textOf = (message: AskMessage) => message.parts.flatMap((part) => (part.type === "text" ? [part.text] : [])).join("\n");

/** Whether the field's text fits on one line, so ↑ and ↓ have nothing to move through in it */
function singleLine(field: HTMLTextAreaElement) {
  if (field.value.includes("\n")) return false;
  const style = getComputedStyle(field);
  return field.scrollHeight <= parseFloat(style.lineHeight) + parseFloat(style.paddingTop) + parseFloat(style.paddingBottom) + 1;
}

interface AskPaletteProps {
  open: boolean;
  /** Where the focus goes back to once it closes (the nav's button) */
  returnFocusTo: RefObject<HTMLElement | null>;
  /** Asks for the palette to close: Esc, a click outside it, Close, or a link followed */
  onDismiss: () => void;
  /** Whether an answer is being written, for the nav's dot */
  onBusyChange: (busy: boolean) => void;
}

/**
 * Deeves, the site's assistant: a keyboard-first palette over the page (full screen on phones).
 * Ask in the top row, read the answer as results, move through its sources with ↑ and ↓
 * and open one with ↵. Following a source, a citation or a page link closes the palette,
 * so the passage can be seen glowing on its page. Loaded the first time it's opened
 * (AskButton), and kept, closed, from then on: the conversation (chat.ts) lasts until the
 * tab closes.
 */
export default function AskPalette({ open, returnFocusTo, onDismiss, onBusyChange }: AskPaletteProps) {
  const { messages, status, sendMessage } = useChat({ chat: askChat, throttle: 50 });
  const busy = status === "submitted" || status === "streaming";
  const router = useRouter();
  const reduced = useReducedMotion();
  const phone = useSyncExternalStore(subscribePhone, isPhone, () => false);
  const dialog = useRef<HTMLDialogElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const head = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const foot = useRef<HTMLDivElement>(null);
  const scroll = useConversationScroll({ panel, head, scroller, log, foot }, open, reduced);
  const pressedOutside = useRef(false);
  const countId = useId();

  const [question, setQuestion] = useState("");
  /** The row the visitor last pointed at or moved to; until then, the newest answer's first */
  const [chosenRow, setChosenRow] = useState<string>();
  /** The last key was ↑ or ↓, so ↵ opens the highlighted row rather than asking */
  const [navigating, setNavigating] = useState(false);

  const passages = useMemo(() => passagesByNumber(messages), [messages]);
  const lastQuestion = messages.findLastIndex((m) => m.role === "user");
  const turns = messages.flatMap((message, i): Turn[] => {
    if (message.role !== "user") return [];
    const next = messages[i + 1];
    const answer = readAnswer(next?.role === "assistant" ? next : undefined);
    const live = busy && i === lastQuestion;
    const pages = new Map(answer.links.map((link) => [link.href, link]));
    const rows: Row[] = live
      ? []
      : [
          ...citedPassages(answer.text, passages).map((p) => ({ key: `${message.id}:${p.n}`, href: p.url, n: p.n, path: p.path })),
          ...[...pages.values()].map((page) => ({ key: `${message.id}:${page.href}`, href: page.href, label: page.label })),
        ];
    return [{ id: message.id, question: textOf(message), answer, live, why: unansweredWhy(message.id), thought: thoughtFor(message.id), rows }];
  });

  const lastTurn = turns.at(-1);
  const limit = useSyncExternalStore(subscribeLimit, currentLimit, () => undefined);
  const rows = turns.flatMap((turn) => turn.rows);
  const highlighted = rows.some((row) => row.key === chosenRow) ? chosenRow : lastTurn?.live ? undefined : lastTurn?.rows[0]?.key;
  // ↵ opens the highlighted row after ↑ or ↓, or with nothing to ask
  const enterOpens = !!highlighted && (navigating || !!limit || !question.trim());

  const focusField = useCallback(() => {
    const el = field.current;
    if (!el) return panel.current?.focus({ preventScroll: true });
    el.focus({ preventScroll: true });
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);

  // The dialog follows `open`, closing after its exit animation (or straight away)
  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open) {
      checkLimit();
      if (!el.open) el.showModal();
      el.dataset.state = "open";
      scroll.current.reopen();
      focusField();
      return;
    }
    if (!el.open) return;
    el.dataset.state = "closing";
    const timer = setTimeout(
      () => {
        el.close();
        el.querySelector("[data-pressed]")?.removeAttribute("data-pressed");
        // The dialog gives the focus back only if something had it when it opened (⌘K needn't)
        if (el.contains(document.activeElement)) returnFocusTo.current?.focus({ preventScroll: true });
      },
      reduced ? 0 : 140,
    );
    return () => clearTimeout(timer);
  }, [open, reduced, focusField, scroll, returnFocusTo]);

  useEffect(() => onBusyChange(busy), [busy, onBusyChange]);

  // The focus stays inside when what had it goes (Stop once the answer's done, the field at
  // the limit), and goes back to the field when it comes back
  useEffect(() => {
    const active = document.activeElement;
    if (open && (!panel.current?.contains(active) || active === panel.current)) focusField();
  }, [open, busy, limit, focusField]);

  // The field grows with the question
  useLayoutEffect(() => {
    const el = field.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [question, phone, limit, open]);

  const follow = useCallback(
    (href: string) => {
      onDismiss();
      openPage(router, href);
    },
    [onDismiss, router],
  );

  function ask() {
    const text = question.trim();
    if (!text || busy || limit) return;
    setQuestion("");
    setChosenRow(undefined);
    setNavigating(false);
    scroll.current.stick();
    void sendMessage({ text });
  }

  function startAgain() {
    startOver();
    setChosenRow(undefined);
    setNavigating(false);
    scroll.current.stick();
    focusField();
  }

  const rowElements = () => [...(log.current?.querySelectorAll<HTMLElement>("[data-row]") ?? [])];

  function openRow(row: HTMLElement) {
    row.dataset.pressed = "";
    row.click();
  }

  // ↵ asks, or opens the highlighted row; ↑ and ↓ move through the rows. Tab stays inside
  // by itself, as the dialog is modal.
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    const vertical = event.key === "ArrowDown" || event.key === "ArrowUp";
    const step = event.key === "ArrowDown" ? 1 : -1;
    const all = rowElements();
    // On a row, the arrows move the focus itself
    if (target.dataset.row !== undefined) {
      if (!vertical) return;
      event.preventDefault();
      all[(all.indexOf(target) + step + all.length) % all.length]?.focus();
      return;
    }
    const onField = target === field.current;
    if ((!onField && target !== panel.current) || event.nativeEvent.isComposing || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      const row = all.find((el) => el.dataset.row === highlighted);
      if (row && (enterOpens || !onField)) openRow(row);
      else if (onField) ask();
    } else if (vertical && !event.shiftKey) {
      if (!all.length || (onField && !singleLine(target as HTMLTextAreaElement))) return;
      event.preventDefault();
      const i = all.findIndex((el) => el.dataset.row === highlighted);
      const next = all[i < 0 ? (step > 0 ? 0 : all.length - 1) : (i + step + all.length) % all.length];
      setNavigating(true);
      setChosenRow(next.dataset.row);
      scroll.current.reveal(next);
    }
  }

  // Pointing at a row, or at a citation of its passage, highlights it
  function highlightAt(target: EventTarget) {
    const el = target as HTMLElement;
    const cite = el.closest?.<HTMLElement>("[data-cite]");
    const row = cite
      ? cite.closest("[data-turn]")?.querySelector<HTMLElement>(`[data-row][data-n="${cite.dataset.cite}"]`)
      : el.closest?.<HTMLElement>("[data-row]");
    if (row?.dataset.row && row.dataset.row !== highlighted) setChosenRow(row.dataset.row);
  }

  const [limitHeadline, ...limitRest] = limit?.split(/(?<=\.) /) ?? [];
  const placeholder = messages.length
    ? "Ask a follow-up…"
    : phone
      ? "Ask about Dimitri’s work…"
      : "Ask about Dimitri’s work, skills or experience…";

  // Its look follows `data-state`, which the effect above sets as it opens and closes
  return createPortal(
    <dialog
      ref={dialog}
      aria-label="Deeves"
      onCancel={(event) => {
        event.preventDefault();
        onDismiss();
      }}
      // The browser can close it without asking (a second Esc, in some)
      onClose={(event) => {
        event.currentTarget.dataset.state = "closed";
        if (open) onDismiss();
      }}
      onPointerDown={(event) => (pressedOutside.current = event.target === event.currentTarget)}
      onClick={(event) => pressedOutside.current && event.target === event.currentTarget && onDismiss()}
      // The whole screen, transparent: the dimmed page is its ::backdrop, and a click on the
      // dialog itself is outside the panel. Closed, it stays laid out but unseen, so nothing
      // in it animates in again, and where it was scrolled to holds.
      className="group/dialog fixed inset-0 m-0 size-full max-h-none max-w-none overflow-hidden border-0 bg-transparent p-0 font-sans text-foreground not-open:block not-open:invisible data-[state=closing]:pointer-events-none backdrop:bg-[hsl(240_6%_10%/0.26)] backdrop:backdrop-blur-[6px] dark:backdrop:bg-black/60 max-md:backdrop:hidden motion-safe:data-[state=closing]:backdrop:animate-fade-out motion-safe:data-[state=open]:backdrop:animate-fade-in [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-2 [&_button:focus-visible]:outline-primary"
    >
      <FollowContext value={follow}>
        <div
          ref={panel}
          tabIndex={-1}
          onKeyDown={onKeyDown}
          className="absolute top-(--top) left-1/2 flex max-h-[min(600px,calc(100dvh-var(--top)-32px))] w-[min(640px,calc(100vw-32px))] -translate-x-1/2 origin-top flex-col overflow-hidden rounded-2xl border border-foreground/10 bg-content1 outline-none [--top:clamp(48px,13vh,128px)] md:shadow-[0_28px_72px_-18px_rgb(17_17_26/0.3),0_10px_24px_-12px_rgb(17_17_26/0.14)] md:dark:shadow-[0_0_0_1px_hsl(0_0%_0%/0.6),0_28px_90px_-10px_hsl(0_0%_0%/0.8),inset_0_1px_0_hsl(0_0%_100%/0.04)] md:motion-safe:group-data-[state=closing]/dialog:animate-palette-out md:motion-safe:group-data-[state=open]/dialog:animate-palette-in max-md:inset-0 max-md:h-dvh max-md:max-h-none max-md:w-full max-md:translate-x-0 max-md:rounded-none max-md:border-0 max-md:bg-background max-md:motion-safe:group-data-[state=closing]/dialog:animate-sheet-out max-md:motion-safe:group-data-[state=open]/dialog:animate-sheet-in"
        >
          {/* While an answer streams, a thin primary-to-secondary light runs along the divider.
              A click anywhere in it but its buttons is a click in the field. */}
          <div
            ref={head}
            data-busy={busy || undefined}
            onMouseDown={(event) => {
              if ((event.target as HTMLElement).closest("button, textarea")) return;
              event.preventDefault();
              focusField();
            }}
            className="group/input relative flex flex-none items-start gap-3 border-b border-foreground/10 pr-3.5 pl-5 after:absolute after:inset-x-0 after:-bottom-px after:h-px after:bg-[linear-gradient(90deg,transparent,hsl(var(--heroui-primary))_35%,hsl(var(--heroui-secondary))_65%,transparent)] after:bg-size-[38%_100%] after:bg-position-[-62%_0] after:bg-no-repeat after:opacity-0 after:transition-opacity after:duration-300 data-busy:after:opacity-100 motion-safe:data-busy:after:animate-scan motion-reduce:after:bg-size-[100%_100%] max-md:gap-2 max-md:pt-[calc(env(safe-area-inset-top)+10px)] max-md:pr-2 max-md:pb-2.5 max-md:pl-3"
          >
            {/* Only a box of its own on phones */}
            <div
              className={`contents max-md:flex max-md:min-h-11 max-md:min-w-0 max-md:flex-1 max-md:items-start max-md:gap-2 max-md:rounded-[22px] max-md:pr-1.5 ${limit ? "max-md:pl-1" : "max-md:bg-default-100 max-md:pl-3"}`}
            >
              <span
                aria-hidden="true"
                className={`mt-[21px] grid size-[18px] flex-none place-items-center transition-colors max-md:mt-[13px] ${limit ? "text-primary-text" : "text-default-500 group-focus-within/input:text-primary-text"}`}
              >
                {limit ? <LuClock size={18} /> : <LuSearch size={18} />}
              </span>
              {limit ? (
                <p role="status" className="min-w-0 flex-1 py-[18px] text-[15px] leading-6 text-default-500 max-md:py-2.5 max-md:pr-1.5 max-md:text-sm max-md:leading-[22px]">
                  <strong className="font-medium text-foreground">{limitHeadline}</strong> {limitRest.join(" ")}
                </p>
              ) : (
                <textarea
                  ref={field}
                  rows={1}
                  maxLength={MAX_QUESTION_CHARS}
                  value={question}
                  placeholder={placeholder}
                  aria-label="Ask Deeves a question"
                  aria-describedby={question.length >= COUNT_FROM ? countId : undefined}
                  autoComplete="off"
                  spellCheck={false}
                  enterKeyHint="send"
                  onChange={(event) => {
                    setQuestion(event.target.value);
                    setNavigating(false);
                  }}
                  className="h-[60px] max-h-[132px] min-w-0 flex-1 resize-none overflow-y-auto border-0 bg-transparent py-[18px] text-lg leading-6 text-foreground caret-primary outline-none [scrollbar-color:hsl(var(--heroui-foreground)/0.18)_transparent] [scrollbar-width:thin] placeholder:text-default-500 max-md:h-11 max-md:max-h-28 max-md:py-[11px] max-md:text-[17px] max-md:leading-[22px]"
                />
              )}
              {!limit && question.length >= COUNT_FROM && (
                <span
                  id={countId}
                  className={`mt-[21px] flex-none text-xs leading-[18px] tabular-nums max-md:mt-[13px] ${question.length >= MAX_QUESTION_CHARS ? "text-foreground" : "text-default-500"}`}
                >
                  {question.length}/{MAX_QUESTION_CHARS}
                </span>
              )}
              {busy ? (
                <button
                  type="button"
                  onClick={() => {
                    stopAnswer();
                    focusField();
                  }}
                  className="mt-[15px] inline-flex h-[30px] flex-none cursor-pointer items-center gap-[7px] rounded-full border border-foreground/10 bg-default-100 pr-3 pl-2.5 text-[13px] font-medium text-foreground transition-colors hover:border-foreground/24 motion-safe:animate-fade-in max-md:mt-[7px]"
                >
                  <StopIcon />
                  <span>Stop</span>
                </button>
              ) : (
                !limit && (
                  <button
                    type="button"
                    aria-label="Ask"
                    disabled={!question.trim()}
                    onClick={ask}
                    className="mt-3.5 grid size-8 flex-none cursor-pointer place-items-center rounded-full bg-primary text-primary-foreground transition-[background-color,color,scale] duration-150 enabled:active:scale-92 disabled:cursor-default disabled:bg-default-100 disabled:text-default-400 max-md:mt-1.5"
                  >
                    <LuArrowUp size={16} strokeWidth={2.2} aria-hidden="true" />
                  </button>
                )
              )}
            </div>
            {/* On a computer Esc and a click outside close it, so only phones show Close */}
            <button type="button" onClick={onDismiss} className="hidden h-11 flex-none cursor-pointer px-2 text-base font-medium text-primary-text max-md:block">
              Close
            </button>
          </div>

          <div
            ref={scroller}
            className="min-h-0 flex-[0_1_auto] overflow-y-auto overscroll-contain transition-[height] duration-220 ease-out-expo [scrollbar-color:hsl(var(--heroui-foreground)/0.18)_transparent] [scrollbar-width:thin] motion-reduce:transition-none max-md:flex-auto"
          >
            <div
              ref={log}
              aria-live="polite"
              aria-busy={busy}
              onPointerMove={(event) => highlightAt(event.target)}
              onFocus={(event) => highlightAt(event.target)}
              className="px-5 pt-3.5 pb-[18px] max-md:px-4 max-md:pt-4 max-md:pb-7"
            >
              {turns.length ? (
                turns.map((turn) => <AskTurn key={turn.id} turn={turn} passages={passages} highlighted={highlighted} enterOpens={enterOpens} />)
              ) : (
                <p className="pt-0.5 pl-[30px] text-[13px] leading-5 text-default-500 max-md:pl-0 max-md:text-sm">
                  Answers come from the pages of this site, with a link to every source.
                </p>
              )}
            </div>
          </div>

          <div
            ref={foot}
            className="flex min-h-10 flex-none items-center justify-between gap-3 border-t border-foreground/10 pr-3.5 pl-5 text-xs text-default-500 max-md:min-h-[52px] max-md:pr-2 max-md:pb-[env(safe-area-inset-bottom)] max-md:pl-4"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={startAgain}
                  className="-ml-[9px] inline-flex h-[26px] cursor-pointer items-center gap-1.5 rounded-full px-[9px] whitespace-nowrap transition-colors hover:bg-default-100 hover:text-foreground max-md:h-10 max-md:px-3 max-md:text-sm"
                >
                  <LuPlus size={13} strokeWidth={2.2} aria-hidden="true" />
                  <span>New conversation</span>
                </button>
              )}
            </div>
            <div aria-hidden="true" className="flex items-center gap-4 whitespace-nowrap max-md:hidden">
              {rows.length > 0 && (
                <span className="flex items-center gap-1.5">
                  <Kbd>↑</Kbd>
                  <Kbd className="-ml-[3px]">↓</Kbd>
                  <span>Sources</span>
                </span>
              )}
              {(enterOpens || !limit) && (
                <span className="flex items-center gap-1.5">
                  <Kbd>↵</Kbd>
                  <span>{enterOpens ? "Open" : "Ask"}</span>
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Kbd>Esc</Kbd>
                <span>Close</span>
              </span>
            </div>
          </div>
        </div>
      </FollowContext>
    </dialog>,
    document.body,
  );
}

/**
 * The conversation's height and scrolling. Away from phones the palette grows with the
 * conversation, smoothly, until it's as tall as it gets; then the conversation scrolls
 * inside it. Either way it follows the newest words, unless the visitor has scrolled up.
 */
function useConversationScroll(
  { panel, head, scroller, log, foot }: Record<"panel" | "head" | "scroller" | "log" | "foot", RefObject<HTMLDivElement | null>>,
  open: boolean,
  reduced: boolean,
) {
  const controls = useRef({
    /** Settles the height and follows the newest words, at once: on opening */
    reopen() {},
    /** Follows the newest words again, wherever the visitor had scrolled: on asking */
    stick() {},
    /** Scrolls `row` into view */
    reveal(_row: HTMLElement) {},
  });
  const settings = useRef({ open, reduced });
  useEffect(() => {
    settings.current = { open, reduced };
  }, [open, reduced]);

  useEffect(() => {
    const [p, h, s, l, f] = [panel.current!, head.current!, scroller.current!, log.current!, foot.current!];
    let height: number | null = null;
    let lastTop = -1;
    let frame = 0;
    let frames = 0;
    let stick = true;

    // Closed, it changes at once (there's nothing to see)
    const setHeight = (instant: boolean) => {
      if (isPhone()) {
        s.style.height = "";
        height = null;
        return;
      }
      const most = parseFloat(getComputedStyle(p).maxHeight) - h.offsetHeight - f.offsetHeight - 2;
      const next = Math.max(0, Math.min(l.offsetHeight, most));
      if (next === height) return;
      height = next;
      if (instant) s.style.transition = "none";
      s.style.height = `${next}px`;
      if (instant) {
        void s.offsetHeight;
        s.style.transition = "";
      }
    };
    const bottom = () => Math.max(0, l.offsetHeight - (height ?? s.clientHeight));
    const setTop = (top: number) => {
      s.scrollTop = top;
      lastTop = s.scrollTop;
    };
    const stopGliding = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };
    // Eases towards the bottom, a step a frame
    const glide = () => {
      frame = 0;
      if (!stick) return;
      const distance = bottom() - s.scrollTop;
      if (Math.abs(distance) < 1 || ++frames > 90) return setTop(bottom());
      setTop(s.scrollTop + distance * 0.3);
      frame = requestAnimationFrame(glide);
    };
    const follow = (instant: boolean) => {
      if (!stick) return;
      if (instant || settings.current.reduced) {
        stopGliding();
        setTop(bottom());
      } else if (!frame) {
        frames = 0;
        frame = requestAnimationFrame(glide);
      }
    };

    const onChange = () => {
      const instant = !settings.current.open;
      setHeight(instant);
      follow(instant);
    };
    // Scrolling up (more than this script's own scrolling) stops the following, until back at the bottom
    const onScroll = () => {
      if (Math.abs(s.scrollTop - lastTop) <= 2) return;
      stick = bottom() - s.scrollTop < 40;
    };
    const onWheel = (event: WheelEvent) => {
      if (event.deltaY < 0 && s.scrollHeight > s.clientHeight + 1) stick = false;
    };
    const onResize = () => setHeight(true);
    const observer = new ResizeObserver(onChange);
    observer.observe(l);
    observer.observe(h);
    s.addEventListener("scroll", onScroll, { passive: true });
    s.addEventListener("wheel", onWheel, { passive: true });
    addEventListener("resize", onResize);

    controls.current = {
      reopen() {
        setHeight(true);
        stick = true;
        follow(true);
      },
      stick() {
        stick = true;
      },
      reveal(row) {
        const r = row.getBoundingClientRect();
        const box = s.getBoundingClientRect();
        const room = 12;
        const by = r.bottom > box.bottom - room ? r.bottom - box.bottom + room : r.top < box.top + room ? r.top - box.top - room : 0;
        if (!by) return;
        stopGliding();
        s.scrollBy({ top: by, behavior: settings.current.reduced ? "auto" : "smooth" });
      },
    };
    return () => {
      observer.disconnect();
      stopGliding();
      s.removeEventListener("scroll", onScroll);
      s.removeEventListener("wheel", onWheel);
      removeEventListener("resize", onResize);
    };
  }, [panel, head, scroller, log, foot]);

  return controls;
}
