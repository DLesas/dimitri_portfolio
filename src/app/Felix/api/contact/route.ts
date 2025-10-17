import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { render, pretty } from "@react-email/render";
import { ContactFormEmail } from "./emailTemplate";

// Validation schema
const contactFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  subject: z.string().min(3, "Subject must be at least 3 characters"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

// AWS SES Configuration
const sesClient = process.env.AWS_REGION
  ? new SESClient({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    })
  : null;

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();

    // Validate the data
    const validatedData = contactFormSchema.parse(body);

    // Send email via AWS SES
    if (sesClient) {
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
          ToAddresses: [process.env.CONTACT_EMAIL || "dimitri.lesas@email.com"],
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
          errors: error.errors.map((err) => ({
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
