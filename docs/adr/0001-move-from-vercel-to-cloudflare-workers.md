# 0001. Move from Vercel to Cloudflare Workers

- Status: Accepted
- Date: 2026-11-18

## Context

footyplanner was a static `index.html` plus two Vercel functions (`/api/day`, `/api/venue`) that proxied ESPN and Photon and were cached on Vercel's CDN with `s-maxage`. The rebuild ([PLAN.md](../PLAN.md)) needs more than that:

- a database for fixtures, venues, saved trips and ingestion state
- scheduled jobs that pull ESPN every minute or two, so the API never calls ESPN while a visitor waits
- object storage for team crests
- rate limiting on the API

It should all stay on a free plan, and the project should be cheap to run indefinitely.

## Decision

Host everything on Cloudflare Workers, using D1 (database), Cron Triggers (scheduled jobs), R2 (crests), Workers Cache (edge caching) and the rate-limiting binding. Each one is attached to the Worker in `wrangler.jsonc` and reached in code as `env.<BINDING>`.

## Alternatives considered

- **Stay on Vercel.** The Hobby plan's cron runs at most once a day, which rules out live-score refreshes. A database, storage and rate limiting would each be another provider (for example Neon, Vercel Blob, Upstash), with separate accounts, credentials and free-tier limits.
- **Split hosting like Rate My Uni** (app and Postgres on Railway, Cloudflare in front for DNS, the firewall and R2). It works well, but it means two providers, and Railway has no free tier that runs indefinitely.
- **A VPS or container.** Full control, but patching, uptime and TLS become this project's problem.

## Consequences

- One provider, one config file and one bill (currently £0). Requests run in the Cloudflare location nearest the visitor, with startup in about 30 ms.
- The Free plan is tight: **10 ms CPU** and **50 outbound requests** per invocation, and 100k D1 row writes a day. Ingestion must be split into small cron runs, and `/api/day` is capped at 40 competitions.
- Workers support only part of Node. Nothing in the plan needs `fs` or native modules, but that rules out some npm packages.
- D1, R2 and the cache headers are Cloudflare-specific. Route code (Hono, see [0004](0004-hono-and-zod-for-the-api.md)) uses web-standard `Request`/`Response` and would move elsewhere largely unchanged.
- The Vercel deployment breaks once this lands, since `index.html` moves and `api/` is deleted. The Vercel project has to be disconnected.
