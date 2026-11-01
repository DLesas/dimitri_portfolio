import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import {
  ConditionalCheckFailedException,
  DynamoDBClient,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { ipAddress } from "@vercel/functions";
import { awsCredentialsProvider } from "@vercel/functions/oidc";
import { render, pretty } from "react-email";
import { ContactFormEmail, contactFormText } from "./emailTemplate";
import { CONTACT_DAILY_LIMIT, CONTACT_FIELD_MAX, CONTACT_FIELD_MIN } from "@/lib/contactForm";
import { CONTACT_EMAIL } from "@/lib/site";

// Validation schema
const contactFormSchema = z.object({
  name: z
    .string()
    .min(CONTACT_FIELD_MIN.name, `Name must be at least ${CONTACT_FIELD_MIN.name} characters`)
    .max(CONTACT_FIELD_MAX.name, `Name must be at most ${CONTACT_FIELD_MAX.name} characters`),
  email: z
    .email("Invalid email address")
    .max(CONTACT_FIELD_MAX.email, `Email must be at most ${CONTACT_FIELD_MAX.email} characters`),
  subject: z
    .string()
    .min(CONTACT_FIELD_MIN.subject, `Subject must be at least ${CONTACT_FIELD_MIN.subject} characters`)
    .max(CONTACT_FIELD_MAX.subject, `Subject must be at most ${CONTACT_FIELD_MAX.subject} characters`),
  message: z
    .string()
    .min(CONTACT_FIELD_MIN.message, `Message must be at least ${CONTACT_FIELD_MIN.message} characters`)
    .max(CONTACT_FIELD_MAX.message, `Message must be at most ${CONTACT_FIELD_MAX.message} characters`),
});

// AWS configuration (infra/email.ts). On Vercel the function swaps its OIDC token for
// AWS_ROLE_ARN's credentials, so no access key is stored; without a role (local
// development) the SDK's usual credential chain applies
const region = process.env.AWS_REGION;
const credentials = process.env.AWS_ROLE_ARN
  ? awsCredentialsProvider({ roleArn: process.env.AWS_ROLE_ARN })
  : undefined;
// Sending needs a verified sender as well as a region: SES rejects any other From address
const fromEmail = process.env.SES_FROM_EMAIL;
const sesClient = region && fromEmail ? new SESClient({ region, credentials }) : null;

// How many messages each visitor sent today, one DynamoDB item per visitor per day. The
// firewall (infra/site.ts) already stops bursts before they get here.
const limitsTable = process.env.CONTACT_LIMITS_TABLE;
const dynamo = region && limitsTable ? new DynamoDBClient({ region, credentials }) : null;

/** Who's sending, for the daily limit: their IP, or for IPv6 its /64, which one device can roam within */
function visitorKey(ip: string | undefined) {
  if (!ip) return "unknown";
  if (ip.includes(".")) return ip.slice(ip.lastIndexOf(":") + 1); // IPv4, or IPv4-mapped IPv6
  const [head, tail = ""] = ip.toLowerCase().split("::");
  const left = head ? head.split(":") : [];
  const right = tail ? tail.split(":") : [];
  const groups = [...left, ...Array(8 - left.length - right.length).fill("0"), ...right];
  return `${groups.slice(0, 4).map((group) => group.replace(/^0+(?=.)/, "")).join(":")}::/64`;
}

/** Counts this message against the visitor's day: false once they've sent the day's limit */
async function withinDailyLimit(request: NextRequest) {
  if (!dynamo) return true;
  const day = new Date().toISOString().slice(0, 10);
  try {
    await dynamo.send(
      new UpdateItemCommand({
        TableName: limitsTable,
        Key: { visitor: { S: `${visitorKey(ipAddress(request))}#${day}` } },
        UpdateExpression: "ADD #sent :one SET #expires = if_not_exists(#expires, :expires)",
        ConditionExpression: "attribute_not_exists(#sent) OR #sent < :limit",
        ExpressionAttributeNames: { "#sent": "sent", "#expires": "expires" },
        ExpressionAttributeValues: {
          ":one": { N: "1" },
          ":limit": { N: String(CONTACT_DAILY_LIMIT) },
          // DynamoDB deletes the count a couple of days later
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

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => undefined);
  if (body === undefined) {
    return NextResponse.json({ success: false, message: "Invalid request" }, { status: 400 });
  }

  const parsed = contactFormSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        message: "Validation failed",
        errors: parsed.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 }
    );
  }
  const validatedData = parsed.data;

  // Without SES there's nothing to send with: fine while developing, an error otherwise
  if (!sesClient || !fromEmail) {
    if (process.env.NODE_ENV === "development") {
      console.log("Contact form submission:", validatedData);
      return NextResponse.json({
        success: true,
        message: "Form received (development mode - no email sent)",
      });
    }
    console.error("Contact form error: AWS SES not configured");
    return serverError();
  }

  try {
    if (!(await withinDailyLimit(request))) {
      return NextResponse.json(
        {
          success: false,
          message: `You've sent ${CONTACT_DAILY_LIMIT} messages today. Please try again tomorrow.`,
        },
        { status: 429 }
      );
    }

    const htmlBody = await pretty(await render(ContactFormEmail(validatedData)));
    await sesClient.send(
      new SendEmailCommand({
        Source: fromEmail,
        Destination: {
          ToAddresses: [process.env.CONTACT_EMAIL || CONTACT_EMAIL],
        },
        Message: {
          Subject: {
            Data: `Contact Form: ${validatedData.subject}`,
            Charset: "UTF-8",
          },
          Body: {
            Html: { Data: htmlBody, Charset: "UTF-8" },
            Text: { Data: contactFormText(validatedData), Charset: "UTF-8" },
          },
        },
        ReplyToAddresses: [validatedData.email],
      })
    );

    return NextResponse.json({
      success: true,
      message: "Thank you for your message! I'll get back to you soon.",
    });
  } catch (error) {
    console.error("Contact form error:", error);
    return serverError();
  }
}

function serverError() {
  return NextResponse.json(
    {
      success: false,
      message: "Something went wrong. Please try again later.",
    },
    { status: 500 }
  );
}
