import { REPLIES, type Reply } from "@/lib/ask/replies";

/**
 * The limit the visitor has reached, until it lifts: the day's questions at midnight UTC
 * (dailyLimit.ts counts by the UTC date), and the query key's monthly spend at the start
 * of the UTC month (OpenRouter's monthly reset). It's the visitor's, not the
 * conversation's, so starting over keeps it. The palette reads it with
 * useSyncExternalStore.
 */

type LimitReply = typeof REPLIES.daily | typeof REPLIES.monthly;

let limit: { reply: LimitReply; lifts: number } | undefined;
let liftTimer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

/** Whether `reply` is a limit's: the daily one or the monthly one */
export const isLimit = (reply: Reply): reply is LimitReply => reply === REPLIES.daily || reply === REPLIES.monthly;

/** When `reply`'s limit lifts, reached at `now`: the next UTC midnight, or the next UTC month */
export function liftsAt(reply: LimitReply, now = new Date()) {
  return reply === REPLIES.daily
    ? Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
    : Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
}

function setLimit(next: typeof limit) {
  limit = next;
  clearTimeout(liftTimer);
  // A timer waits at most about 24 days, so a longer wait is checked again then
  if (next) liftTimer = setTimeout(checkLimit, Math.min(Math.max(0, next.lifts - Date.now()), 2 ** 31 - 1));
  for (const listener of listeners) listener();
}

/** Notes that the visitor has reached `reply`'s limit */
export const reachLimit = (reply: LimitReply) => setLimit({ reply, lifts: liftsAt(reply) });

/** Lifts the limit once its time has come; the palette checks too as it opens, as a computer that slept can run its timers late */
export function checkLimit() {
  if (limit) setLimit(Date.now() < limit.lifts ? limit : undefined);
}

/** The limit's words while it holds */
export const currentLimit = () => limit?.reply;

export function subscribeLimit(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
