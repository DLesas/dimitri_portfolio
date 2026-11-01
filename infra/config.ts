import * as pulumi from "@pulumi/pulumi";

/** Settings from Pulumi.prod.yaml */
export const config = new pulumi.Config();

/** Where alerts go: the monthly budget and the live cursors' cutoff */
export const alertEmail = config.require("alertEmail");

/** The Vercel team (its slug), as in Vercel's URLs and OIDC tokens */
export const vercelTeam = new pulumi.Config("vercel").require("team");
export const vercelProject = config.require("vercelProject");
