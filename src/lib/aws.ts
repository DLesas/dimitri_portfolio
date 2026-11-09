import { awsCredentialsProvider } from "@vercel/functions/oidc";

/**
 * The region and credentials for an AWS SDK client that acts as `roleArn` (infra/access).
 * On Vercel the function swaps its OIDC token for the role's credentials, so no access key
 * is stored; without a role (local development) the SDK's usual credential chain applies.
 * `region` is unset where the site has no AWS (AWS_REGION, set in infra/site.ts).
 */
export function awsConfig(roleArn: string | undefined) {
  return {
    region: process.env.AWS_REGION,
    credentials: roleArn ? awsCredentialsProvider({ roleArn }) : undefined,
  };
}
