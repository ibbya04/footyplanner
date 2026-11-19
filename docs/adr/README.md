# Architecture decision records

Short records of the decisions that shape footyplanner: the context, what was chosen, what else was considered, and what follows from it. One file per decision, numbered in the order they were made. A decision that's later reversed gets a new ADR that supersedes the old one; the old one stays.

| #                                                              | Decision                                        | Status   |
| -------------------------------------------------------------- | ----------------------------------------------- | -------- |
| [0001](0001-move-from-vercel-to-cloudflare-workers.md)         | Move from Vercel to Cloudflare Workers          | Accepted |
| [0002](0002-one-worker-for-page-api-and-cron.md)               | One Worker for the page, the API and cron       | Accepted |
| [0003](0003-pnpm-workspace-monorepo.md)                        | pnpm workspace monorepo                         | Accepted |
| [0004](0004-hono-and-zod-for-the-api.md)                       | Hono and Zod for the API                        | Accepted |
| [0005](0005-edge-caching-with-workers-cache.md)                | Edge caching with Workers Cache                 | Accepted |
| [0006](0006-ci-and-deploys-with-github-actions.md)             | CI and deploys with GitHub Actions              | Accepted |
| [0007](0007-d1-with-drizzle.md)                                | D1 with Drizzle for the database                | Accepted |
| [0008](0008-cron-only-ingestion.md)                            | Ingest ESPN on a schedule, never on request     | Accepted |
| [0009](0009-free-plan-ingestion-queue.md)                      | A work queue to fit the Free plan's limits      | Accepted |
| [0010](0010-venues-geocoded-in-cron-with-overrides.md)         | Venues geocoded in the cron, with overrides     | Accepted |
| [0011](0011-crests-copied-to-r2.md)                            | Crests and logos copied to R2                   | Accepted |
| [0012](0012-react-frontend-built-alongside-the-legacy-page.md) | React frontend, built alongside the legacy page | Accepted |

## Template

```markdown
# NNNN. Title

- Status: Proposed | Accepted | Superseded by NNNN
- Date: YYYY-MM-DD

## Context

## Decision

## Alternatives considered

## Consequences
```
