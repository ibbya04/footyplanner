# 0006. CI and deploys with GitHub Actions

- Status: Accepted
- Date: 2026-11-18

## Context

Vercel deployed every push automatically, with no checks. There were no tests to run. The rebuild adds tests, types and linting, and from step 2, D1 migrations that must be applied before the code that needs them goes live.

## Decision

One workflow, `.github/workflows/ci.yml`:

- **`check`** on every pull request and push: `pnpm install --frozen-lockfile`, then `format:check`, `lint`, `typecheck` (including `wrangler types --check`) and `test`.
- **`preview`** on pull requests from this repo, after `check` passes: `wrangler versions upload --preview-alias pr-<n>` uploads a version that gets no live traffic, and the job comments its URL on the pull request.
- **`deploy`** on pushes to `main`, after `check` passes: `wrangler deploy`, under a GitHub `production` environment. From step 2 it applies D1 migrations first.
- Cloudflare credentials are the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets.

## Alternatives considered

- **Cloudflare Workers Builds** (Cloudflare's Git integration). Less setup, but the build runs on Cloudflare, so checks and history are less visible on GitHub, and running migrations before deploying is awkward.
- **Deploying by hand with `wrangler deploy`.** Fine for the first deploy, easy to forget the checks after that.

## Consequences

- Nothing reaches production without passing format, lint, types and tests. Pull requests get a working preview link.
- The pipeline is in the repo and visible on GitHub, which helps a reviewer judge the project.
- Jobs that set `permissions` lose the defaults, so they must list `contents: read` themselves. The first preview run failed without it.
- Preview and deploy jobs need the two secrets. Pull requests from forks skip `preview`, since they don't get secrets.
