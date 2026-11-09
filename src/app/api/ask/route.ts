import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ProvisionedThroughputExceededException } from "@aws-sdk/client-dynamodb";
import { answer, lastQuestion, validateConversation } from "@/lib/ask/agent";
import { DAILY_QUESTIONS, MAX_QUESTION_CHARS } from "@/lib/ask/config";
import { REPLIES } from "@/lib/ask/replies";
import { chunkStore } from "@/lib/ask/store";
import { withinDailyLimit } from "@/lib/dailyLimit";

/**
 * Deeves, the site's assistant (src/lib/ask/agent.ts). POST `{ messages }`: the conversation so far,
 * as the AI SDK's useChat sends it, ending with the visitor's question. The answer
 * streams back as UI messages.
 *
 * Each visitor (IP) gets DAILY_QUESTIONS a day, counted only once a question is valid, and
 * the query key's monthly limit in OpenRouter caps the spend. Production only: elsewhere
 * there's no chunk table or key (infra/ask.ts), and it answers 503.
 */

// An answer can take a few searches and a long reply
export const maxDuration = 60;

const store = chunkStore();
const apiKey = process.env.OPENROUTER_QUERY_KEY;
const limitsTable = process.env.ASK_LIMITS_TABLE;
const dailyCounts = store && limitsTable ? { dynamo: store.dynamo, table: limitsTable } : null;

const refuse = (status: number, message: string) => NextResponse.json({ message }, { status });

export async function POST(request: NextRequest) {
  // Only the site's own pages may ask: a browser on another site says so, or sends its origin
  const origin = request.headers.get("origin");
  const site = request.headers.get("sec-fetch-site");
  if ((site && site !== "same-origin") || (origin && origin !== request.nextUrl.origin)) {
    return refuse(403, REPLIES.offSite);
  }
  if (!store || !apiKey) return refuse(503, REPLIES.unavailable);

  const body = z.object({ messages: z.array(z.unknown()).min(1).max(100) }).safeParse(await request.json().catch(() => undefined));
  if (!body.success) return refuse(400, "Invalid request");
  const messages = await validateConversation(body.data.messages).catch(() => undefined);
  const question = messages && lastQuestion(messages);
  if (!messages || !question) return refuse(400, "Invalid request");
  if (question.length > MAX_QUESTION_CHARS) return refuse(400, REPLIES.tooLong);

  try {
    if (dailyCounts && !(await withinDailyLimit(dailyCounts, request, DAILY_QUESTIONS))) {
      return refuse(429, REPLIES.daily);
    }
  } catch (error) {
    // The count's table has fixed capacity (infra/ask.ts): a flood is turned away, not
    // billed. Chosen knowingly: a flood from enough IPs makes everyone wait while it lasts,
    // which beats paying for it (and the query key's monthly limit is the last word anyway)
    if (error instanceof ProvisionedThroughputExceededException) {
      return refuse(429, REPLIES.busy);
    }
    console.error("Site assistant: counting a question failed", error);
    return refuse(500, REPLIES.failed);
  }

  return answer(messages, { store, apiKey, signal: request.signal });
}
