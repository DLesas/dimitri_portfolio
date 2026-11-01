#!/bin/sh
# Runs Pulumi on the prod stack with the credentials kept outside the repo:
# the 'personal' AWS profile, a Vercel token and the stack's passphrase
export AWS_PROFILE=personal
export VERCEL_API_TOKEN="$(cat "$HOME/.config/lesas/vercel-token")"
export PULUMI_CONFIG_PASSPHRASE_FILE="$HOME/.config/lesas/pulumi-passphrase"
exec pulumi "$@" --stack prod
