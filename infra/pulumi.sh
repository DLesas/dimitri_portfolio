#!/bin/sh
# Runs Pulumi on the prod stack of the project in the current folder (this one, or
# access/ through ../pulumi.sh) with the credentials kept outside the repo: the
# 'personal' AWS profile, Vercel and Cloudflare tokens and the stacks' passphrase. CI
# has its own.
#
# Given one of this folder's scripts instead (./pulumi.sh ./rebuild-site.sh), it runs
# that with the same credentials.
export AWS_PROFILE=personal
export VERCEL_API_TOKEN="$(cat "$HOME/.config/lesas/vercel-token")"
export CLOUDFLARE_API_TOKEN="$(cat "$HOME/.config/lesas/cloudflare-token")"
export PULUMI_CONFIG_PASSPHRASE_FILE="$HOME/.config/lesas/pulumi-passphrase"
case "$1" in
  ./*) exec "$@" ;;
esac
exec pulumi "$@" --stack prod
