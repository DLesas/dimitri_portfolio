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
import { awsCredentialsProvider } from "@vercel/functions/oidc";
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
 * can't run the counts up (the firewall's one rate limit is the contact form's).
 *
 * Production only: elsewhere (previews, local development) there's no table, and both
 * answer 204, no content.
 */

// On Vercel the function swaps its OIDC token for the role's credentials, as the contact
// form does, so no access key is stored
const region = process.env.AWS_REGION;
const roleArn = process.env.BLOG_READS_ROLE_ARN;
const table = process.env.BLOG_READS_TABLE;
const store =
  region && table
    ? { table, dynamo: new DynamoDBClient({ region, credentials: roleArn ? awsCredentialsProvider({ roleArn }) : undefined }) }
    : null;

const DAILY_READS_PER_IP = 30;
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

  try {
    // All three, or none
    await dynamo.send(
      new TransactWriteItemsCommand({
        TransactItems: [
          // This IP's read of this post: once a day
          {
            Put: {
              TableName: table,
              Item: { id: { S: `seen#${slug}#${ip}` }, expires: { N: String(now + DAY) } },
              ConditionExpression: "attribute_not_exists(#id) OR #expires < :now",
              ExpressionAttributeNames: { "#id": "id", "#expires": "expires" },
              ExpressionAttributeValues: { ":now": { N: String(now) } },
            },
          },
          // This IP's reads today, of any post
          {
            Update: {
              TableName: table,
              Key: { id: { S: `ip#${ip}#${day}` } },
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
      })
    );
  } catch (error) {
    // Already counted today, or past the day's limit: not counted, but still answered
    if (!(error instanceof TransactionCanceledException)) return failed(error);
  }

  try {
    const { Item } = await dynamo.send(new GetItemCommand({ TableName: table, Key: countKey(slug), ConsistentRead: true }));
    return NextResponse.json({ reads: readsOf(Item) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return failed(error);
  }
}
