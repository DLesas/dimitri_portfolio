"use client";

import dynamic from "next/dynamic";
import { useCallback, useReducer, useRef } from "react";
import { LuSearch } from "react-icons/lu";
import { detectPlatform, formatForDisplay, formatHotkey, parseHotkey, useHotkey } from "@tanstack/react-hotkeys";
import { useHydrated } from "@/hooks/useHydrated";
import { Kbd } from "./Kbd";

/** The palette, with the chat and Markdown libraries: fetched when first wanted, not with the page */
const loadPalette = () => import("./AskPalette");
const AskPalette = dynamic(loadPalette, { ssr: false });

const SHORTCUT = "Mod+K";

interface State {
  open: boolean;
  /** Opened at least once, so the palette is loaded (and stays, keeping the conversation) */
  loaded: boolean;
  /** An answer is being written */
  busy: boolean;
  /** An answer finished while the palette was closed */
  unread: boolean;
}

type Action = "toggle" | "close" | "busy" | "idle";

function reduce(state: State, action: Action): State {
  switch (action) {
    case "toggle":
      return state.open ? { ...state, open: false } : { ...state, open: true, loaded: true, unread: false };
    case "close":
      return { ...state, open: false };
    case "busy":
      return { ...state, busy: true };
    case "idle":
      return { ...state, busy: false, unread: state.unread || (state.busy && !state.open) };
  }
}

/**
 * The way in to Deeves, the site's assistant, in the nav: "Ask about Dimitri…" with its shortcut
 * (⌘K, or Ctrl+K), or just an icon where the nav is short of room. A dot on it shows an
 * answer being written, or one that came while the palette was closed.
 */
export function AskButton() {
  const [state, dispatch] = useReducer(reduce, { open: false, loaded: false, busy: false, unread: false });
  const button = useRef<HTMLButtonElement>(null);
  const toggle = useCallback(() => dispatch("toggle"), []);
  const close = useCallback(() => dispatch("close"), []);
  const setBusy = useCallback((busy: boolean) => dispatch(busy ? "busy" : "idle"), []);
  useHotkey(SHORTCUT, toggle);
  // The platform's keys only after hydration, as the server can't know them
  const platform = useHydrated() ? detectPlatform() : undefined;
  const dot = state.open ? null : state.busy ? "busy" : state.unread ? "unread" : null;

  return (
    <>
      <button
        ref={button}
        type="button"
        aria-label="Ask about Dimitri"
        aria-haspopup="dialog"
        aria-expanded={state.open}
        aria-keyshortcuts={platform && formatHotkey(parseHotkey(SHORTCUT, platform))}
        onClick={toggle}
        onPointerEnter={loadPalette}
        onFocus={loadPalette}
        className="relative inline-flex size-8 items-center justify-center rounded-full text-foreground/70 transition-colors outline-primary before:absolute before:-inset-1.5 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 lg:mr-1.5 lg:w-[212px] lg:justify-start lg:gap-2 lg:border lg:border-foreground/12 lg:bg-default-100/45 lg:pr-[5px] lg:pl-[11px] lg:text-[13px] lg:leading-none lg:text-default-500 lg:before:hidden lg:hover:border-foreground/24 lg:active:bg-default-100"
      >
        <LuSearch aria-hidden="true" className="size-[18px] shrink-0 lg:size-[15px]" />
        <span aria-hidden="true" className="hidden min-w-0 flex-1 truncate text-left lg:block">
          Ask about Dimitri…
        </span>
        {platform && (
          <span aria-hidden="true" className="hidden lg:contents">
            <Kbd round>{formatForDisplay(SHORTCUT, { platform })}</Kbd>
          </span>
        )}
        {dot && (
          <span
            aria-hidden="true"
            className={`absolute -top-0.5 -right-0.5 size-2 rounded-full bg-primary ring-2 ring-background ${dot === "busy" ? "motion-safe:animate-pulse" : ""}`}
          />
        )}
      </button>
      {state.loaded && <AskPalette open={state.open} returnFocusTo={button} onDismiss={close} onBusyChange={setBusy} />}
    </>
  );
}
