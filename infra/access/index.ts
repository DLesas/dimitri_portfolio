/**
 * Identity and access for lesas.dev's infrastructure. Deployed by hand (`npm run deploy`
 * in this folder), never by CI: these resources decide what everything else may do.
 *
 * - The S3 bucket holding Pulumi's state, for this stack and the main one (../)
 * - The roles the main stack's resources run as: the cutoff Lambda and the contact form
 * - Sign-in trust (OIDC) for Vercel and GitHub Actions, and the roles GitHub Actions
 *   assumes to preview and deploy the main stack. The deploy role can't change IAM, so
 *   CI can't grant itself more than it has.
 */
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

const config = new pulumi.Config();
const githubRepo = config.require("githubRepo");
const vercelTeam = config.require("vercelTeam");
const vercelProject = config.require("vercelProject");
const stateBucketName = config.require("stateBucket");

const account = aws.getCallerIdentityOutput().accountId;
const region = aws.getRegionOutput().name;

const policy = (statements: pulumi.Input<object>[]) =>
  pulumi.jsonStringify({ Version: "2012-10-17", Statement: statements });
const arn = (service: string, resource: string, inRegion = true) =>
  pulumi.interpolate`arn:aws:${service}:${inRegion ? region : ""}:${account}:${resource}`;

// ---- Pulumi state ----

// Created by hand before Pulumi existed here (a stack can't create its own state store)
const stateBucket = new aws.s3.Bucket("pulumi-state", { bucket: stateBucketName }, { protect: true });
new aws.s3.BucketVersioning(
  "pulumi-state",
  { bucket: stateBucket.id, versioningConfiguration: { status: "Enabled", mfaDelete: "Disabled" } },
  { protect: true }
);
new aws.s3.BucketPublicAccessBlock(
  "pulumi-state",
  {
    bucket: stateBucket.id,
    blockPublicAcls: true,
    blockPublicPolicy: true,
    ignorePublicAcls: true,
    restrictPublicBuckets: true,
  },
  { protect: true }
);

// ---- Roles the main stack's resources run as ----

// The live cursors' circuit breaker (../realtime.ts): deletes the API keys under abuse,
// and every 15 minutes reads the API's traffic to check this month's spend
const cutoffRole = new aws.iam.Role(
  "realtime-cutoff",
  {
    name: "realtime-cutoff-be94c57",
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({ Service: "lambda.amazonaws.com" }),
  },
  { protect: true }
);
new aws.iam.RolePolicyAttachment(
  "realtime-cutoff-logs",
  { role: cutoffRole.name, policyArn: aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole },
  { protect: true }
);
// API key actions are authorised against arn:…:/v1/apis/<id>/apikeys[/<key>]. Any API in
// the region: the Lambda only touches the one its API_ID names.
const apiKeys = pulumi.interpolate`arn:aws:appsync:${region}:${account}:/v1/apis/*/apikeys`;
new aws.iam.RolePolicy(
  "realtime-cutoff-keys",
  {
    name: "realtime-cutoff-keys-1735021",
    role: cutoffRole.id,
    policy: policy([
      {
        Effect: "Allow",
        Action: ["appsync:ListApiKeys", "appsync:DeleteApiKey"],
        Resource: [apiKeys, pulumi.interpolate`${apiKeys}/*`],
      },
      // Metric reads can't be narrowed to one metric
      { Effect: "Allow", Action: "cloudwatch:GetMetricData", Resource: "*" },
      // Past the cap, it raises the alarm on its own topic
      { Effect: "Allow", Action: "sns:Publish", Resource: arn("sns", "lesas-realtime-cutoff") },
    ]),
  },
  { protect: true }
);

// The contact form (../email.ts): production Vercel functions swap their OIDC token for
// this role, which can only send as contact@lesas.dev, only to the inbox, and count each
// visitor's messages for the daily limit. Previews can be built from any branch, so they
// don't get it (their contact form can't send).
const vercelIssuer = `oidc.vercel.com/${vercelTeam}`;
const vercelOidc = new aws.iam.OpenIdConnectProvider(
  "vercel",
  { url: `https://${vercelIssuer}`, clientIdLists: [`https://vercel.com/${vercelTeam}`] },
  { protect: true }
);
const contactRole = new aws.iam.Role(
  "contact-form",
  {
    name: "lesas-contact-form",
    description: "Assumed by the site's Vercel functions (OIDC) to send contact form emails",
    assumeRolePolicy: policy([
      {
        Effect: "Allow",
        Principal: { Federated: vercelOidc.arn },
        Action: "sts:AssumeRoleWithWebIdentity",
        Condition: {
          StringEquals: {
            [`${vercelIssuer}:aud`]: `https://vercel.com/${vercelTeam}`,
            // This project's production deployments only
            [`${vercelIssuer}:sub`]: `owner:${vercelTeam}:project:${vercelProject}:environment:production`,
          },
        },
      },
    ]),
  },
  { protect: true }
);
const sesIdentity = (name: string) => pulumi.interpolate`arn:aws:ses:${region}:${account}:identity/${name}`;
new aws.iam.RolePolicy(
  "contact-form-send",
  {
    name: "contact-form-send-eed051f",
    role: contactRole.id,
    policy: policy([
      {
        Effect: "Allow",
        Action: ["ses:SendEmail", "ses:SendRawEmail"],
        Resource: [sesIdentity("lesas.dev"), sesIdentity("dlesas@hotmail.com")],
        Condition: {
          StringEquals: { "ses:FromAddress": "contact@lesas.dev" },
          "ForAllValues:StringEquals": { "ses:Recipients": ["dlesas@hotmail.com"] },
        },
      },
      // Counting each visitor's messages for the daily limit
      { Effect: "Allow", Action: "dynamodb:UpdateItem", Resource: arn("dynamodb", "table/lesas-contact-limits") },
    ]),
  },
  { protect: true }
);

// ---- GitHub Actions (.github/workflows/infra.yml) ----

const githubIssuer = "token.actions.githubusercontent.com";
const githubOidc = new aws.iam.OpenIdConnectProvider("github", {
  url: `https://${githubIssuer}`,
  clientIdLists: ["sts.amazonaws.com"],
});
const githubTrust = (subject: string) =>
  policy([
    {
      Effect: "Allow",
      Principal: { Federated: githubOidc.arn },
      Action: "sts:AssumeRoleWithWebIdentity",
      Condition: {
        StringEquals: {
          [`${githubIssuer}:aud`]: "sts.amazonaws.com",
          [`${githubIssuer}:sub`]: subject,
        },
      },
    },
  ]);

// The main stack's state, and the lock `pulumi up` takes on it, live under these prefixes
// (this stack's are not among them)
const mainState = [
  ".pulumi/stacks/lesas-infra/*",
  ".pulumi/history/lesas-infra/*",
  ".pulumi/backups/lesas-infra/*",
  ".pulumi/locks/organization/lesas-infra/*",
].map((prefix) => pulumi.interpolate`${stateBucket.arn}/${prefix}`);
const readState = {
  Effect: "Allow",
  Action: ["s3:GetObject", "s3:ListBucket"],
  Resource: [stateBucket.arn, pulumi.interpolate`${stateBucket.arn}/*`],
};

// Each role trusts one GitHub environment, not a branch or event: a job only gets the
// environment's secrets and this sign-in once the environment's rules let it run
// (infra-preview: approved by the repo owner; infra: the main branch only).

// Pull requests: preview what would change, read-only
const previewRole = new aws.iam.Role("ci-preview", {
  name: "lesas-infra-preview",
  description: "GitHub Actions on pull requests: previews the main Pulumi stack",
  assumeRolePolicy: githubTrust(`repo:${githubRepo}:environment:infra-preview`),
});
new aws.iam.RolePolicy("ci-preview", {
  role: previewRole.id,
  policy: policy([
    readState,
    {
      Effect: "Allow",
      Action: [
        "sts:GetCallerIdentity",
        "appsync:Get*",
        "appsync:List*",
        "lambda:Get*",
        "lambda:List*",
        "sns:Get*",
        "sns:List*",
        "cloudwatch:Describe*",
        "cloudwatch:ListTagsForResource",
        "events:Describe*",
        "events:List*",
        "dynamodb:Describe*",
        "dynamodb:List*",
        "logs:Describe*",
        "logs:ListTagsForResource",
        "budgets:ViewBudget",
        "budgets:ListTagsForResource",
        "ses:Get*",
        "ses:List*",
      ],
      Resource: "*",
    },
  ]),
});

// Merges to main: apply the main stack. Only this project's resources, and no IAM
// changes: the roles it needs are made here, by hand.
const deployRole = new aws.iam.Role("ci-deploy", {
  name: "lesas-infra-deploy",
  description: "GitHub Actions on main: deploys the main Pulumi stack",
  assumeRolePolicy: githubTrust(`repo:${githubRepo}:environment:infra`),
});
new aws.iam.RolePolicy("ci-deploy", {
  role: deployRole.id,
  policy: policy([
    readState,
    { Effect: "Allow", Action: ["s3:PutObject", "s3:DeleteObject"], Resource: mainState },
    {
      Effect: "Allow",
      // Actions that can't be narrowed to a resource
      Action: [
        "sts:GetCallerIdentity",
        "appsync:List*",
        "lambda:List*",
        "sns:ListTopics",
        "logs:DescribeLogGroups",
        "ses:GetAccount",
        "ses:List*",
      ],
      Resource: "*",
    },
    { Effect: "Allow", Action: "appsync:*", Resource: arn("appsync", "*") },
    { Effect: "Allow", Action: "lambda:*", Resource: arn("lambda", "function:lesas-*") },
    { Effect: "Allow", Action: "sns:*", Resource: arn("sns", "lesas-*") },
    { Effect: "Allow", Action: "cloudwatch:*", Resource: arn("cloudwatch", "alarm:lesas-*") },
    { Effect: "Allow", Action: "events:*", Resource: arn("events", "rule/lesas-*") },
    { Effect: "Allow", Action: "dynamodb:*", Resource: arn("dynamodb", "table/lesas-*") },
    { Effect: "Allow", Action: "logs:*", Resource: arn("logs", "log-group:/aws/lambda/lesas-*") },
    {
      Effect: "Allow",
      Action: "budgets:*",
      Resource: ["budget/monthly-cost", "budget/lesas-realtime"].map((budget) => arn("budgets", budget, false)),
    },
    {
      Effect: "Allow",
      Action: "ses:*",
      Resource: [sesIdentity("lesas.dev"), sesIdentity("dlesas@hotmail.com")],
    },
    {
      Effect: "Allow",
      Action: "iam:PassRole",
      Resource: cutoffRole.arn,
      Condition: { StringEquals: { "iam:PassedToService": "lambda.amazonaws.com" } },
    },
  ]),
});

export const cutoffRoleArn = cutoffRole.arn;
export const contactRoleArn = contactRole.arn;
export const ciPreviewRoleArn = previewRole.arn;
export const ciDeployRoleArn = deployRole.arn;
