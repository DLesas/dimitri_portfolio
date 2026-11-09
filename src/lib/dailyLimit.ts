import { ConditionalCheckFailedException, DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { ipAddress } from "@vercel/functions";
import { visitorKey } from "@/lib/visitorKey";

/** A table counting each visitor's requests a day: one item per visitor per day */
export interface DailyCounts {
  dynamo: DynamoDBClient;
  table: string;
}

/**
 * Counts this request against its visitor's day, in `counts`: false once they've made
 * `limit` today. DynamoDB deletes each day's count a couple of days later (`expires`).
 */
export async function withinDailyLimit({ dynamo, table }: DailyCounts, request: Request, limit: number) {
  const day = new Date().toISOString().slice(0, 10);
  try {
    await dynamo.send(
      new UpdateItemCommand({
        TableName: table,
        Key: { visitor: { S: `${visitorKey(ipAddress(request))}#${day}` } },
        UpdateExpression: "ADD #sent :one SET #expires = if_not_exists(#expires, :expires)",
        ConditionExpression: "attribute_not_exists(#sent) OR #sent < :limit",
        ExpressionAttributeNames: { "#sent": "sent", "#expires": "expires" },
        ExpressionAttributeValues: {
          ":one": { N: "1" },
          ":limit": { N: String(limit) },
          ":expires": { N: String(Math.floor(Date.now() / 1000) + 2 * 24 * 60 * 60) },
        },
      })
    );
    return true;
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) return false;
    throw error;
  }
}
