import React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
  Tailwind,
} from "@react-email/components";

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export const ContactFormEmail = ({
  name,
  email,
  subject,
  message,
}: ContactFormData) => (
  <Html>
    <Head />
    <Preview>New contact form submission from {name}</Preview>
    <Tailwind>
      <Body className="bg-gray-100 font-sans">
        <Container className="mx-auto py-20 px-0">
          <Section className="bg-white rounded-lg shadow-lg px-10 py-8 mx-auto max-w-2xl">
            <Heading className="text-2xl font-bold text-gray-900 mb-4">
              New Contact Form Submission
            </Heading>

            <Text className="text-gray-600 mb-6">
              You have received a new message from your portfolio contact form.
            </Text>

            <Hr className="border-gray-300 my-6" />

            <Section className="mb-6">
              <Text className="text-sm font-semibold text-gray-700 mb-1">
                From:
              </Text>
              <Text className="text-gray-900 mb-4">
                {name} ({email})
              </Text>

              <Text className="text-sm font-semibold text-gray-700 mb-1">
                Subject:
              </Text>
              <Text className="text-gray-900 mb-4">{subject}</Text>

              <Text className="text-sm font-semibold text-gray-700 mb-1">
                Message:
              </Text>
              <Section className="bg-gray-50 rounded-md p-4 mt-2">
                <Text className="text-gray-900 whitespace-pre-wrap">
                  {message}
                </Text>
              </Section>
            </Section>

            <Hr className="border-gray-300 my-6" />

            <Section className="text-center">
              <Button
                className="bg-blue-600 text-white px-6 py-3 rounded-md font-medium"
                href={`mailto:${email}?subject=Re: ${encodeURIComponent(subject)}`}
              >
                Reply to {name}
              </Button>
            </Section>

            <Text className="text-xs text-gray-500 text-center mt-8">
              This email was sent from your portfolio contact form.
              <br />
              Sender IP and timestamp have been logged for security.
            </Text>
          </Section>

          <Text className="text-xs text-gray-400 text-center mt-4">
            © {new Date().getFullYear()} Dimitri Lesas. All rights reserved.
          </Text>
        </Container>
      </Body>
    </Tailwind>
  </Html>
);
