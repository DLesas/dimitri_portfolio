import * as pulumi from "@pulumi/pulumi";

/** Settings from Pulumi.prod.yaml */
export const config = new pulumi.Config();

/** Where alerts go: the monthly budget and the live cursors' cutoff */
export const alertEmail = config.require("alertEmail");

export const vercelProject = config.require("vercelProject");

/**
 * The identity and access stack (access/): the roles this stack's resources run as. It's
 * deployed by hand, so CI, which deploys this stack, can't change IAM.
 */
export const access = new pulumi.StackReference("organization/lesas-access/prod");
