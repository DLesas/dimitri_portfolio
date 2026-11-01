/**
 * Email for the contact form: the SES identities (imported as they were set up in the
 * console), and what the site needs to send through them.
 *
 * The site's Vercel functions get an OIDC token from Vercel and swap it for the contact
 * form role's credentials (see src/app/api/contact/route.ts), so no AWS access key is
 * stored anywhere. The role, made in access/index.ts, can only send as FROM_ADDRESS.
 */
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { access } from "./config";

const FROM_ADDRESS = "contact@lesas.dev";
const INBOX = "dlesas@hotmail.com";

// ---- SES identities ----

const domain = new aws.sesv2.EmailIdentity(
  "lesas-dev",
  { emailIdentity: "lesas.dev", dkimSigningAttributes: { nextSigningKeyLength: "RSA_2048_BIT" } },
  { protect: true }
);
// Bounces go to mail.lesas.dev, so SPF aligns with the lesas.dev sender
new aws.sesv2.EmailIdentityMailFromAttributes(
  "lesas-dev-mail-from",
  { emailIdentity: domain.emailIdentity, mailFromDomain: "mail.lesas.dev" },
  { protect: true }
);
new aws.sesv2.EmailIdentity(
  "contact-inbox",
  { emailIdentity: INBOX, dkimSigningAttributes: { nextSigningKeyLength: "RSA_1024_BIT" } },
  { protect: true }
);

/** What the contact form reads (src/app/api/contact/route.ts) */
export const contactEnv: Record<string, pulumi.Input<string>> = {
  AWS_REGION: aws.getRegionOutput().name,
  AWS_ROLE_ARN: access.requireOutput("contactRoleArn") as pulumi.Output<string>,
  SES_FROM_EMAIL: FROM_ADDRESS,
  CONTACT_EMAIL: INBOX,
};
