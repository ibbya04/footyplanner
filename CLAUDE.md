# footyplanner

A map of European football fixtures for planning trips. One Cloudflare Worker serves the page, the API (`/api/*`, `/img/*`) and a cron that copies ESPN data into D1. The rebuild plan, its step order and the open follow-ups are in `docs/PLAN.md`; read it before starting work.

## Layout

- `apps/api`: the Worker. Hono routes in `src/routes/`, cron ingestion in `src/ingest/` (entry point `run.ts`), Drizzle schema in `src/db/schema.ts`, migrations in `migrations/`.
- `apps/web/legacy`: the old single-file page, served as static assets until step 3 replaces it with React.
- `packages/shared`: types and helpers used by both the API and the page.
- `docs/adr/`: architecture decision records.

## Commands

Run pnpm through corepack (`corepack pnpm …`); plain `pnpm` isn't on the PATH.

- `corepack pnpm format:check && corepack pnpm lint && corepack pnpm typecheck && corepack pnpm test`: the same checks CI runs. Run them all before committing.
- `corepack pnpm dev`: `wrangler dev` with local D1 and R2.
- After changing `apps/api/wrangler.jsonc`, run `corepack pnpm --filter @footyplanner/api types`, or typecheck fails on stale `worker-configuration.d.ts`.
- After changing `src/db/schema.ts`, run `corepack pnpm --filter @footyplanner/api db:generate` and commit the new migration.

## Rules

- No comments in code. Code should read clearly on its own through naming and small functions. Any design decision that needs explaining gets an ADR in `docs/adr/` (template in `docs/adr/README.md`, added to its index), not a comment.
- Do every change in a git worktree on its own branch, never in the main checkout.
- Merging to `main` deploys: CI applies D1 migrations to production, then runs `wrangler deploy`. Migrations must be safe to apply before the new code is live.
- Visitor requests never call ESPN or Photon. Only the cron fetches upstream data.
- Tests run inside workerd against local D1 and R2 (`@cloudflare/vitest-plugin`). Ingestion tests use the fake upstream in `apps/api/test/ingest/fake-upstream.ts` and saved ESPN responses, never the real APIs.

## Cloudflare Free plan limits

Code has to fit these; going over fails or stops the site rather than billing.

- 10 ms CPU per invocation, including each cron run. Production runs currently exceed this (see Follow-ups in `docs/PLAN.md`).
- 50 subrequests per invocation. Fetches, D1 queries and R2 calls all count; a D1 batch counts as one.
- D1: 100 bound parameters per query, and 100k rows written a day. Going over the write limit stops every query until 00:00 UTC, so never rewrite unchanged rows.
- 100k Worker requests a day.

## Checking production

- `https://footyplanner.footyplanner-api.workers.dev/api/status`: last cron run, months fetched, pending venues and crests.
- `npx wrangler tail footyplanner` (from `apps/api`): live logs with CPU time per run.
- `npx wrangler d1 execute footyplanner --remote --command "…"`: query the production database (`ingest_runs`, `ingest_queue`, `fixture_changes`).
