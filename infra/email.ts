/**
 * Email for the contact form: the SES identities (imported as they were set up in the
 * console) and a keyless way for the site to send through them.
 *
 * The site's Vercel functions get an OIDC token from Vercel and swap it for this role's
 * credentials (see src/app/api/contact/route.ts), so no AWS access key is stored anywhere.
 * The role can only send from FROM_ADDRESS.
 */
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { vercelProject, vercelTeam } from "./config";

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
const inbox = new aws.sesv2.EmailIdentity(
  "contact-inbox",
  { emailIdentity: INBOX, dkimSigningAttributes: { nextSigningKeyLength: "RSA_1024_BIT" } },
  { protect: true }
);

// ---- Keyless sending from Vercel ----

// Vercel's team issuer: tokens say which team, project and environment they're for
const issuer = `oidc.vercel.com/${vercelTeam}`;
const vercelOidc = new aws.iam.OpenIdConnectProvider("vercel", {
  url: `https://${issuer}`,
  clientIdLists: [`https://vercel.com/${vercelTeam}`],
});

const contactRole = new aws.iam.Role("contact-form", {
  name: "lesas-contact-form",
  description: "Assumed by the site's Vercel functions (OIDC) to send contact form emails",
  assumeRolePolicy: vercelOidc.arn.apply((providerArn) =>
    JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: { Federated: providerArn },
          Action: "sts:AssumeRoleWithWebIdentity",
          Condition: {
            StringEquals: { [`${issuer}:aud`]: `https://vercel.com/${vercelTeam}` },
            // Production and preview deployments of this project only
            StringLike: {
              [`${issuer}:sub`]: `owner:${vercelTeam}:project:${vercelProject}:environment:*`,
            },
          },
        },
      ],
    })
  ),
});

new aws.iam.RolePolicy("contact-form-send", {
  role: contactRole.id,
  policy: pulumi.all([domain.arn, inbox.arn]).apply(([domainArn, inboxArn]) =>
    JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Action: ["ses:SendEmail", "ses:SendRawEmail"],
          Resource: [domainArn, inboxArn],
          Condition: { StringEquals: { "ses:FromAddress": FROM_ADDRESS } },
        },
      ],
    })
  ),
});

/** What the contact form reads (src/app/api/contact/route.ts) */
export const contactEnv: Record<string, pulumi.Input<string>> = {
  AWS_REGION: aws.getRegionOutput().name,
  AWS_ROLE_ARN: contactRole.arn,
  SES_FROM_EMAIL: FROM_ADDRESS,
  CONTACT_EMAIL: INBOX,
};
