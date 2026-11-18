# 0002. One Worker for the page, the API and cron

- Status: Accepted
- Date: 2026-11-18

## Context

The rebuild has three parts that run code or serve files: the frontend (static files), the API (`/api/*`) and, from step 2, the cron ingestion. Rate My Uni runs its frontend and backend as separate services. Its write-up notes the downside: the API sits on a different domain from the site, so it skips the firewall in front of the site and needs CORS.

## Decision

Deploy a single Worker (`apps/api`, named `footyplanner`) that:

- serves the built frontend as **static assets** (`assets.directory`), which are served without running the Worker
- runs the Hono app only for `/api/*` (`run_worker_first: ["/api/*"]`)
- will run the ingestion from its `scheduled` handler

Ingestion code is kept in its own module, so it can be moved into a separate Worker later without rewriting it.

## Alternatives considered

- **Separate web and API Workers.** Independent deploys, but two URLs, CORS on every API call, two configs and two deploy jobs. Nothing in a one-person project needs independent deploys.
- **Cloudflare Pages for the frontend plus a Worker.** Cloudflare is merging Pages into Workers static assets, and new projects are pointed at Workers.
- **A separate Worker just for cron.** Keeps cron CPU apart from requests, but they don't compete anyway: each invocation has its own limits.

## Consequences

- The site and API share one address, so there's no CORS, and the browser calls relative URLs (`api/day`). A custom domain later protects both with one set of firewall rules.
- Static files are free, unlimited and don't count towards the Worker's 100k requests a day.
- One deploy updates everything. A broken frontend build blocks an API fix and the other way round, which CI ([0006](0006-ci-and-deploys-with-github-actions.md)) reduces by checking both before deploying.
- The Worker package is named `apps/api` but also owns the asset config. In step 3 its `assets.directory` points at the Vite build output instead of `apps/web/legacy`.
