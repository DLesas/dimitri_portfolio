import { DAILY_QUESTIONS, MAX_QUESTION_CHARS } from "./config";

/**
 * What Dimitri's assistant says when it doesn't answer: the route's refusals and the
 * stream's errors (agent.ts). The palette shows only these words, anything else as
 * `failed`, and knows the limits by theirs.
 */
export const REPLIES = {
  offSite: "Dimitri's assistant only answers on lesas.dev.",
  unavailable: "Dimitri's assistant isn't available here.",
  tooLong: `Questions can be up to ${MAX_QUESTION_CHARS} characters.`,
  daily: `You've asked ${DAILY_QUESTIONS} questions today. Please come back tomorrow.`,
  busy: "Dimitri's assistant is busy. Please try again in a minute.",
  monthly: "Dimitri's assistant has answered all it can this month. Please try again next month.",
  failed: "Something went wrong. Please try again in a moment.",
} as const;

export type Reply = (typeof REPLIES)[keyof typeof REPLIES];
