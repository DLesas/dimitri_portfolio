import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  BatchGetItemCommand,
  DynamoDBClient,
  GetItemCommand,
  TransactWriteItemsCommand,
  TransactionCanceledException,
} from "@aws-sdk/client-dynamodb";
import { ipAddress } from "@vercel/functions";
import { awsConfig } from "@/lib/aws";
import { SLUG_PATTERN } from "@/lib/blog/format";
import { visitorKey } from "@/lib/visitorKey";

/**
 * Blog posts' read counts (infra/blog.ts).
 *
 * - GET ?slug=a&slug=b: `{ reads: { a: 12, b: 0 } }`, which Vercel's CDN keeps for a minute
 * - POST `{ slug }`: counts a read and returns `{ reads: 13 }`
 *
 * A post page counts its reader once per browser (the browser remembers). Here, each IP
 * counts once per post a day, and for at most DAILY_READS_PER_IP posts a day, so a script
 * can't run the counts up (the firewall's one rate limit is the contact form's). Repeats
 * and IPs past the limit are answered from one read, without writing, and the table's
 * fixed capacity (infra/blog.ts) throttles a flood rather than billing for it.
 *
 * Production only: elsewhere (previews, local development) there's no table, and both
 * answer 204, no content.
 */

// AWS as the read counts' role, with no access key stored (src/lib/aws.ts)
const aws = awsConfig(process.env.BLOG_READS_ROLE_ARN);
const table = process.env.BLOG_READS_TABLE;
const store = aws.region && table ? { table, dynamo: new DynamoDBClient(aws) } : null;

const DAILY_READS_PER_IP = 30;
/** Tries at counting a read that keeps colliding with others' (see POST) */
const COUNT_ATTEMPTS = 4;
const MAX_SLUGS = 50;
const DAY = 24 * 60 * 60;
// The CDN keeps counts for a minute, then serves them while it fetches new ones
const CACHED = "public, max-age=0, s-maxage=60, stale-while-revalidate=600";

const slugSchema = z.string().max(100).regex(SLUG_PATTERN);
/** A post's count's item */
const countKey = (slug: string) => ({ id: { S: `post#${slug}` } });
const readsOf = (item: Record<string, { N?: string }> | undefined) => Number(item?.reads?.N ?? 0);

const notKept = () => new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
const failed = (error: unknown) => {
  console.error("Read counts error:", error);
  return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
};

export async function GET(request: NextRequest) {
  const parsed = z.array(slugSchema).min(1).max(MAX_SLUGS).safeParse(request.nextUrl.searchParams.getAll("slug"));
  if (!parsed.success) return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  if (!store) return notKept();

  const { table, dynamo } = store;
  const slugs = [...new Set(parsed.data)];
  try {
    const { Responses, UnprocessedKeys } = await dynamo.send(
      new BatchGetItemCommand({ RequestItems: { [table]: { Keys: slugs.map(countKey) } } })
    );
    const found = new Map((Responses?.[table] ?? []).map((item) => [item.id.S, readsOf(item)]));
    const skipped = new Set(UnprocessedKeys?.[table]?.Keys?.map((key) => key.id.S));
    // Posts nobody has read have no item yet: 0. Any DynamoDB didn't get to are left out.
    const reads = Object.fromEntries(
      slugs.filter((slug) => !skipped.has(`post#${slug}`)).map((slug) => [slug, found.get(`post#${slug}`) ?? 0])
    );
    return NextResponse.json({ reads }, { headers: { "Cache-Control": skipped.size ? "no-store" : CACHED } });
  } catch (error) {
    return failed(error);
  }
}

export async function POST(request: NextRequest) {
  const parsed = z.object({ slug: slugSchema }).safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  if (!store) return notKept();

  const { table, dynamo } = store;
  const { slug } = parsed.data;
  const now = Math.floor(Date.now() / 1000);
  const day = new Date().toISOString().slice(0, 10);
  // The IP isn't kept, only a hash of it, in items deleted within a day or two
  const ip = createHash("sha256").update(visitorKey(ipAddress(request))).digest("base64url").slice(0, 22);
  const seenKey = { id: { S: `seen#${slug}#${ip}` } };
  const ipKey = { id: { S: `ip#${ip}#${day}` } };

  // First, one read: a repeat, or an IP past its day's limit, is answered without writing
  // anything. The transaction's conditions still decide; this only spares it the work.
  let counting = true;
  try {
    const { Responses, UnprocessedKeys } = await dynamo.send(
      new BatchGetItemCommand({ RequestItems: { [table]: { Keys: [seenKey, ipKey, countKey(slug)] } } })
    );
    const items = new Map((Responses?.[table] ?? []).map((item) => [item.id.S, item]));
    const seenUntil = Number(items.get(seenKey.id.S)?.expires?.N ?? 0);
    const readsToday = Number(items.get(ipKey.id.S)?.count?.N ?? 0);
    if (seenUntil >= now || readsToday >= DAILY_READS_PER_IP) {
      // Under load DynamoDB can leave keys unread: then the count comes from its own read below
      const countUnread = UnprocessedKeys?.[table]?.Keys?.some((key) => key.id.S === `post#${slug}`);
      if (!countUnread) {
        return NextResponse.json({ reads: readsOf(items.get(`post#${slug}`)) }, { headers: { "Cache-Control": "no-store" } });
      }
      counting = false;
    }
  } catch (error) {
    return failed(error);
  }

  // All three, or none
  const countIt = () =>
    new TransactWriteItemsCommand({
      TransactItems: [
        // This IP's read of this post: once a day
        {
          Put: {
            TableName: table,
            Item: { ...seenKey, expires: { N: String(now + DAY) } },
            ConditionExpression: "attribute_not_exists(#id) OR #expires < :now",
            ExpressionAttributeNames: { "#id": "id", "#expires": "expires" },
            ExpressionAttributeValues: { ":now": { N: String(now) } },
          },
        },
        // This IP's reads today, of any post
        {
          Update: {
            TableName: table,
            Key: ipKey,
            UpdateExpression: "ADD #count :one SET #expires = if_not_exists(#expires, :expires)",
            ConditionExpression: "attribute_not_exists(#count) OR #count < :limit",
            ExpressionAttributeNames: { "#count": "count", "#expires": "expires" },
            ExpressionAttributeValues: {
              ":one": { N: "1" },
              ":limit": { N: String(DAILY_READS_PER_IP) },
              ":expires": { N: String(now + 2 * DAY) },
            },
          },
        },
        // The post's count
        {
          Update: {
            TableName: table,
            Key: countKey(slug),
            UpdateExpression: "ADD #reads :one",
            ExpressionAttributeNames: { "#reads": "reads" },
            ExpressionAttributeValues: { ":one": { N: "1" } },
          },
        },
      ],
    });

  // Skipped for a repeat whose count is still to be read
  for (let attempt = 1; counting; attempt++) {
    try {
      await dynamo.send(countIt());
      break;
    } catch (error) {
      if (error instanceof TransactionCanceledException) {
        const reasons = (error.CancellationReasons ?? []).map((reason) => reason.Code ?? "None");
        // Already counted today, or past the day's limit: not counted, but still answered
        if (reasons.includes("ConditionalCheckFailed") && reasons.every((code) => code === "None" || code === "ConditionalCheckFailed")) break;
        // Another reader counted the post at the same moment: try again shortly (DynamoDB
        // cancels conflicting transactions, and the SDK doesn't retry them)
        if (reasons.includes("TransactionConflict") && attempt < COUNT_ATTEMPTS) {
          await new Promise((resolve) => setTimeout(resolve, 25 * attempt + Math.random() * 50));
          continue;
        }
      }
      // Anything else isn't answered as counted, so the browser tries again next visit
      return failed(error);
    }
  }

  try {
    const { Item } = await dynamo.send(new GetItemCommand({ TableName: table, Key: countKey(slug), ConsistentRead: true }));
    return NextResponse.json({ reads: readsOf(Item) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return failed(error);
  }
}
