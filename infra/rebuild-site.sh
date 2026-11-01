#!/bin/sh
# Starts a fresh production build of the site from main. Vercel reads environment
# variables when a build starts, so the site only sees changed ones (a renewed or
# restored API key, say) after this.
#
# CI runs it after a deploy that changed anything. Locally it's `npm run rebuild-site`,
# after `npm run restore` or `npm run renew-key`, which runs it with pulumi.sh's
# credentials. Either way it needs VERCEL_API_TOKEN, and pulumi able to read the stack:
# the team, project and repository come from its config (Pulumi.prod.yaml).
set -eu
cd "$(dirname "$0")"

team=$(pulumi config get vercel:team --stack prod)
project=$(pulumi config get vercelProject --stack prod)
repo=$(pulumi config get githubRepo --stack prod) # owner/name

body=$(jq -n --arg project "$project" --arg org "${repo%%/*}" --arg repo "${repo#*/}" '{
  name: $project,
  project: $project,
  target: "production",
  gitSource: { type: "github", org: $org, repo: $repo, ref: "main" }
}')
# Not piped straight into jq, so a failed request fails the script
deployment=$(curl -fsS -X POST "https://api.vercel.com/v13/deployments?slug=$team" \
  -H "Authorization: Bearer $VERCEL_API_TOKEN" -H "Content-Type: application/json" \
  -d "$body")
printf '%s\n' "$deployment" | jq '{id, url, readyState}'
