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
import { render, pretty } from "@react-email/render";
import { ContactFormEmail } from "./emailTemplate";
import { CONTACT_DAILY_LIMIT, CONTACT_FIELD_MAX } from "@/lib/contactForm";

// Validation schema
const contactFormSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(CONTACT_FIELD_MAX.name, `Name must be at most ${CONTACT_FIELD_MAX.name} characters`),
  email: z
    .email("Invalid email address")
    .max(CONTACT_FIELD_MAX.email, `Email must be at most ${CONTACT_FIELD_MAX.email} characters`),
  subject: z
    .string()
    .min(3, "Subject must be at least 3 characters")
    .max(CONTACT_FIELD_MAX.subject, `Subject must be at most ${CONTACT_FIELD_MAX.subject} characters`),
  message: z
    .string()
    .min(10, "Message must be at least 10 characters")
    .max(CONTACT_FIELD_MAX.message, `Message must be at most ${CONTACT_FIELD_MAX.message} characters`),
});

// AWS configuration (infra/email.ts). On Vercel the function swaps its OIDC token for
// AWS_ROLE_ARN's credentials, so no access key is stored; without a role (local
// development) the SDK's usual credential chain applies
const region = process.env.AWS_REGION;
const credentials = process.env.AWS_ROLE_ARN
  ? awsCredentialsProvider({ roleArn: process.env.AWS_ROLE_ARN })
  : undefined;
const sesClient = region ? new SESClient({ region, credentials }) : null;

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
  try {
    // Parse request body
    const body = await request.json().catch(() => undefined);
    if (body === undefined) {
      return NextResponse.json({ success: false, message: "Invalid request" }, { status: 400 });
    }

    // Validate the data
    const validatedData = contactFormSchema.parse(body);

    // Send email via AWS SES
    if (sesClient) {
      if (!(await withinDailyLimit(request))) {
        return NextResponse.json(
          {
            success: false,
            message: `You've sent ${CONTACT_DAILY_LIMIT} messages today. Please try again tomorrow.`,
          },
          { status: 429 }
        );
      }

      // Generate the email HTML using @react-email/render
      const emailComponent = ContactFormEmail({
        name: validatedData.name,
        email: validatedData.email,
        subject: validatedData.subject,
        message: validatedData.message,
      });

      const htmlBody = await pretty(await render(emailComponent));

      // Create plain text version
      const textBody = `
New Contact Form Submission

From: ${validatedData.name} (${validatedData.email})
Subject: ${validatedData.subject}

Message:
${validatedData.message}

---
This email was sent from your portfolio contact form.
      `;

      // Create the email command
      const command = new SendEmailCommand({
        Source: process.env.SES_FROM_EMAIL || "noreply@example.com",
        Destination: {
          ToAddresses: [process.env.CONTACT_EMAIL || "dlesas@hotmail.com"],
        },
        Message: {
          Subject: {
            Data: `Contact Form: ${validatedData.subject}`,
            Charset: "UTF-8",
          },
          Body: {
            Html: {
              Data: htmlBody,
              Charset: "UTF-8",
            },
            Text: {
              Data: textBody,
              Charset: "UTF-8",
            },
          },
        },
        ReplyToAddresses: [validatedData.email],
      });

      await sesClient.send(command);
    } else {
      // Fallback: Log the submission (for development)
      console.log("Contact form submission:", validatedData);

      if (!process.env.NODE_ENV || process.env.NODE_ENV === "development") {
        return NextResponse.json({
          success: true,
          message: "Form received (development mode - no email sent)",
          data: validatedData,
        });
      } else {
        throw new Error("AWS SES not configured");
      }
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: "Thank you for your message! I'll get back to you soon.",
    });
  } catch (error) {
    console.error("Contact form error:", error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed",
          errors: error.issues.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    // Handle other errors
    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong. Please try again later.",
      },
      { status: 500 }
    );
  }
}
