# lesas.dev

The source for [lesas.dev](https://lesas.dev), my portfolio. I use it to try things properly rather than as a static CV page: the home page is a live 3D network that shows other visitors' cursors in real time, the site has an assistant that answers questions about my work and cites the exact passage each answer came from, and the blog explains how it's all built with figures you can play with.

It's also built to be left alone. Every page is server-rendered first, the 3D scales to the device it's on, and anything that costs money has a hard cap. The AWS side averages about twenty cents a month.

## What's in it

- **A 3D home page.** A network of nodes drawn in four draw calls, with physics at a fixed 60 Hz and a grid to find connections. Node count and detail adapt to the device's CPU, memory and GPU, so it holds up on a mid-range phone.
- **Live cursors.** Visitors see each other's cursors over AppSync Events. If traffic spikes or the month's spend passes $2, a function deletes the API key and switches them off, so they can't run up a bill.
- **Deeves, the site assistant.** Press ⌘K and ask about my work. The site's text is cut into passages, embedded (Qwen3-Embedding-8B, 4,096 dimensions) and stored in DynamoDB. A question is matched by meaning (vector search) and by words (BM25), the two rankings are merged, and the answer links back to the passages it used. Each deploy re-embeds only the passages that changed, and visitors have daily limits.
- **A blog in MDX**, with interactive figures: 3D diagrams, a map of every passage on the site flattened with PCA or UMAP, and data remade from the live site on each production build. Every post is checked at build time (metadata, headings, alt text) and gets its SEO tags, structured data, share image and RSS entry automatically.
- **Theming.** Pick one colour and the whole palette is generated from it, in light and dark, and remembered.
- **A contact form with no stored AWS keys.** The function swaps its Vercel OIDC token for a role that can email exactly one inbox, with a daily limit per visitor.
- **Infrastructure as code.** Everything on AWS, Vercel and Cloudflare is Pulumi in TypeScript, previewed on pull requests and deployed on merge.

Two posts go into the detail: [How the home page is built](https://lesas.dev/blog/how-the-home-page-is-built) and [How this site finds its own words](https://lesas.dev/blog/how-this-site-finds-its-own-words).

## Stack

Next.js 16 (App Router, React 19), TypeScript, Tailwind CSS 4 and HeroUI, three.js with react-three-fiber, MDX. On AWS: AppSync Events, DynamoDB (including its vector index), SES and Budgets. Models through OpenRouter. Hosted on Vercel, DNS on Cloudflare, all of it managed with Pulumi.

## Running it locally

```bash
git clone https://github.com/DLesas/dimitri_portfolio.git
cd dimitri_portfolio
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

No environment variables are needed. Without them the site runs with no live cursors, the assistant switched off, and a contact form that logs submissions instead of sending them. `env.example` lists what the site reads; with access to the Vercel project, `vercel env pull .env.local` fetches them.

| Command            | What it does                                                         |
| ------------------ | -------------------------------------------------------------------- |
| `npm test`         | Runs the unit tests                                                  |
| `npm run lint`     | Lints the code                                                       |
| `npm run build`    | Builds the site (only production builds on Vercel touch the tables)  |
| `npm run ask:diff` | Shows which passages the next deploy will embed, and what it'll cost |
| `npm run ask:map`  | Remakes the data behind the embeddings post                          |

## Infrastructure

The cloud resources are Pulumi programs in TypeScript under `infra/`, with their state in S3. There are two stacks:

- **`infra/access/`** (`lesas-access`): identity and access. The S3 state bucket, OIDC trust for GitHub Actions and Vercel, and the IAM roles everything else runs as. It's deployed by hand, never by CI, so CI can't change what it's allowed to do. Deploy it first.
- **`infra/`** (`lesas-infra`): everything else. The live cursors (AppSync Events) and their automatic cutoff, SES and the contact form's limits table, the assistant's passage table and its two capped OpenRouter keys, the blog's read counts, the Vercel project with its domains, firewall and environment variables, the lesas.dev DNS records on Cloudflare, and the cost budgets. It reads its roles from the access stack.

GitHub Actions (`.github/workflows/infra.yml`) previews the main stack on pull requests from this repository (not forks) and deploys it on merge to `main`, then rebuilds the site if anything changed. Each job signs in to AWS through GitHub OIDC, so no AWS keys are stored. The GitHub environments `infra-preview` and `infra` hold the secrets `PULUMI_CONFIG_PASSPHRASE`, `VERCEL_API_TOKEN` and `CLOUDFLARE_API_TOKEN` (read-only in `infra-preview`, since previews run the pull request's own code); the repository variables `AWS_PREVIEW_ROLE_ARN` and `AWS_DEPLOY_ROLE_ARN` come from the access stack's outputs.

Locally, the npm scripts run Pulumi through `infra/pulumi.sh`, which uses the `personal` AWS profile and reads the Vercel and Cloudflare tokens and the Pulumi passphrase from `~/.config/lesas/`:

| Command (in `infra/`)  | What it does                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------ |
| `npm run preview`      | Shows what a deploy would change                                                                 |
| `npm run deploy`       | Deploys the main stack (CI normally does this)                                                   |
| `npm run outputs`      | Prints the stack's outputs                                                                       |
| `npm run renew-key`    | Replaces the live cursors' API key, which lasts at most a year                                   |
| `npm run restore`      | Brings the API key back after the cutoff deleted it                                              |
| `npm run rebuild-site` | Rebuilds the site on Vercel so it sees changed environment variables: run it after the two above |

In `infra/access/`, `npm run preview`, `npm run deploy` and `npm run outputs` do the same for the access stack.
