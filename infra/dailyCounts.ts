import * as aws from "@pulumi/aws";

/**
 * A table counting each visitor's requests a day, for a daily limit
 * (src/lib/dailyLimit.ts): one item per visitor per day, which DynamoDB deletes a couple
 * of days later (the site sets `expires`)
 */
export const dailyCountsTable = (
  name: string,
  args: Pick<aws.dynamodb.TableArgs, "name" | "billingMode" | "readCapacity" | "writeCapacity">
) =>
  new aws.dynamodb.Table(name, {
    ...args,
    hashKey: "visitor",
    attributes: [{ name: "visitor", type: "S" }],
    ttl: { attributeName: "expires", enabled: true },
  });
