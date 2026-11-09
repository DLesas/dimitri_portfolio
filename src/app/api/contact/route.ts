import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { render, pretty } from "react-email";
import { ContactFormEmail, contactFormText } from "./emailTemplate";
import { awsConfig } from "@/lib/aws";
import { CONTACT_DAILY_LIMIT, CONTACT_FIELD_MAX, CONTACT_FIELD_MIN } from "@/lib/contactForm";
import { withinDailyLimit } from "@/lib/dailyLimit";
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

// AWS (infra/email.ts), as AWS_ROLE_ARN. Sending needs a verified sender as well as a
// region: SES rejects any other From address
const aws = awsConfig(process.env.AWS_ROLE_ARN);
const fromEmail = process.env.SES_FROM_EMAIL;
const sesClient = aws.region && fromEmail ? new SESClient(aws) : null;

// How many messages each visitor sent today. The firewall (infra/site.ts) already stops
// bursts before they get here.
const limitsTable = process.env.CONTACT_LIMITS_TABLE;
const dailyCounts = aws.region && limitsTable ? { dynamo: new DynamoDBClient(aws), table: limitsTable } : null;

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
    if (dailyCounts && !(await withinDailyLimit(dailyCounts, request, CONTACT_DAILY_LIMIT))) {
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
