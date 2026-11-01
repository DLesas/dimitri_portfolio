#!/bin/sh
# Runs Pulumi on this project's prod stack with the 'personal' AWS profile and the
# stack passphrase kept outside the repo. Run by hand only: CI can't change IAM.
export AWS_PROFILE=personal
export PULUMI_CONFIG_PASSPHRASE_FILE="$HOME/.config/lesas/pulumi-passphrase"
exec pulumi "$@" --stack prod
