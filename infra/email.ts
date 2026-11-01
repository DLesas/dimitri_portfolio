/**
 * Email for the contact form: the SES identities (imported as they were set up in the
 * console), the table that counts each visitor's messages, and what the site needs to
 * send through them.
 *
 * The site's Vercel functions get an OIDC token from Vercel and swap it for the contact
 * form role's credentials (see src/app/api/contact/route.ts), so no AWS access key is
 * stored anywhere. The role, made in access/index.ts, can only send as FROM_ADDRESS, to
 * INBOX (names.ts), and only production deployments can assume it.
 */
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { contactRoleArn } from "./config";
import { CONTACT_LIMITS_TABLE, EMAIL_DOMAIN, FROM_ADDRESS, INBOX } from "./names";

// ---- SES identities ----

const domain = new aws.sesv2.EmailIdentity(
  "lesas-dev",
  { emailIdentity: EMAIL_DOMAIN, dkimSigningAttributes: { nextSigningKeyLength: "RSA_2048_BIT" } },
  { protect: true }
);
/** The names SES publishes the domain's DKIM keys under (dns.ts makes their records) */
export const dkimTokens = domain.dkimSigningAttributes.apply((dkim) => dkim?.tokens ?? []);
// Bounces go to mail.lesas.dev, so SPF aligns with the lesas.dev sender
new aws.sesv2.EmailIdentityMailFromAttributes(
  "lesas-dev-mail-from",
  { emailIdentity: domain.emailIdentity, mailFromDomain: `mail.${EMAIL_DOMAIN}` },
  { protect: true }
);
new aws.sesv2.EmailIdentity(
  "contact-inbox",
  { emailIdentity: INBOX, dkimSigningAttributes: { nextSigningKeyLength: "RSA_1024_BIT" } },
  { protect: true }
);

// ---- Daily limit ----

// How many messages each visitor has sent today: one item per visitor per day, which
// DynamoDB deletes a couple of days later (the route sets `expires`)
const contactLimits = new aws.dynamodb.Table("contact-limits", {
  name: CONTACT_LIMITS_TABLE,
  billingMode: "PAY_PER_REQUEST",
  hashKey: "visitor",
  attributes: [{ name: "visitor", type: "S" }],
  ttl: { attributeName: "expires", enabled: true },
});

/** What the contact form reads (src/app/api/contact/route.ts) */
export const contactEnv: Record<string, pulumi.Input<string>> = {
  AWS_REGION: aws.getRegionOutput().region,
  AWS_ROLE_ARN: contactRoleArn,
  SES_FROM_EMAIL: FROM_ADDRESS,
  CONTACT_EMAIL: INBOX,
  CONTACT_LIMITS_TABLE: contactLimits.name,
};
