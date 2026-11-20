# 0019. Custom domain, with `workers.dev` turned off

- Status: Accepted
- Date: 2026-11-20

## Context

The site has been served from `footyplanner.footyplanner-api.workers.dev` ([decision 6 in the plan](../PLAN.md#decisions)). Every request already goes through Cloudflare's edge, with its TLS and DDoS protection, but `workers.dev` isn't a zone we control, so it can't have WAF or rate limiting rules. The only protection is the Worker's own rate limiters (`API_LIMITER`, `TRIP_LIMITER`), which run inside the Worker: a refused request still counts towards the Free plan's 100k requests a day, and once those are spent the whole site stops until 00:00 UTC.

`footyplanner.co.uk` was registered at names.co.uk and its nameservers pointed at Cloudflare, as a zone on the Free plan.

## Decision

- **The Worker is served on `footyplanner.co.uk`** as a Workers custom domain (`routes` in `wrangler.jsonc`, `custom_domain: true`). `wrangler deploy` creates the DNS record and certificate, so the zone has no hand-made records.
- **`workers.dev` is turned off** (`workers_dev: false`). If it kept serving, anyone could reach the Worker around the zone's rules by using that address.
- **Preview URLs stay on** (`preview_urls: true`), so pull requests keep getting `pr-<number>-footyplanner.<account>.workers.dev`. They serve versions that aren't deployed and are only linked from pull requests.
- **Edge rules live on the zone**, set in the Cloudflare dashboard after the first deploy, not in the repo: the Free managed WAF ruleset and a rate limiting rule on `/api/*`. The Worker's own limiters stay as a second layer, `TRIP_LIMITER` especially, since it guards D1 writes.

## Alternatives considered

- **Redirect `workers.dev` to the custom domain.** Keeps old links working, but static files are served without running the Worker ([ADR 0002](0002-one-worker-for-page-api-and-cron.md)), so redirecting the page would mean running the Worker for every file, several invocations per visit. Splitting it (a 301 from the Worker for `/api`, `/img` and `/t`, and a redirect in the browser for the page) is more code for one saved trip in production.
- **Leave `workers.dev` serving alongside the domain.** Nothing breaks, but the zone's rules protect nothing.
- **Cloudflare Registrar** sells domains at cost. The domain was bought at names.co.uk, which works the same once its nameservers point at Cloudflare.

## Consequences

- The site's address is `https://footyplanner.co.uk`. The domain is the project's first running cost; Cloudflare stays on the Free plan.
- Old `workers.dev` links stop working, including the one trip saved before the move, and its calendar feed. Shortlists live in `localStorage` per origin ([ADR 0016](0016-shortlist-kept-in-the-browser.md)), so one made on `workers.dev` doesn't appear on the new domain.
- `www.footyplanner.co.uk` doesn't resolve. A redirect rule on the zone can add it later.
- The deploy token needs permission to add the custom domain on the zone as well as to deploy the Worker.
- Local development and the Playwright tests are unaffected: `wrangler dev` ignores routes.
