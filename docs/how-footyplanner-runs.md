# How footyplanner runs: one Cloudflare Worker, a cron and a SQLite database

_21 November 2026 · ~9 min read_

[footyplanner](https://footyplanner.co.uk) is a map of European football fixtures for planning trips: pick some dates, optionally a place and a distance, and see every fixture across 26 competitions on a map, with a shortlist you can turn into a shareable trip and a calendar feed. The product is small. The interesting part is that it started life as one 2,573-line HTML file and is now a typed, tested monorepo running entirely on Cloudflare, with its own data pipeline.

This post walks through that architecture: what runs where, why each piece sits where it does, the numbers from production, and the rough edges I'd fix next.

## Topology

Everything runs on Cloudflare: one Worker, a D1 (SQLite) database and an R2 bucket, behind the zone for `footyplanner.co.uk`.

![footyplanner architecture: visitors reach one Cloudflare Worker through edge rules and the edge cache; the cron fills D1 and R2 from ESPN and Photon](architecture.svg)

A visitor's request passes the zone's WAF and rate limiting rules first. Static files (the React build) are served straight from Workers static assets without running any code. Requests for `/api/*`, `/img/*` and `/t/*` reach the Worker, and most API responses are answered from Cloudflare's edge cache before the Worker runs. On a miss, the Worker reads D1 or R2 and nothing else.

The other half of the Worker is a cron handler that runs every minute. It is the only code that talks to ESPN (fixtures) and Photon (geocoding), and it writes everything visitors read. The browser talks to two outside services directly: Esri for map tiles and Photon for place search. GitHub Actions deploys on merge, applying D1 migrations first.

## Where it started

The first version was a single `index.html` with the CSS, the JavaScript, a ~260-line table of known venue coordinates and hard-coded competition lists, plus two Vercel functions that proxied ESPN and Photon. There was no database, no types, no tests and no CI.

It worked, but every visitor's request ended up at ESPN. Viewing a week meant seven `/api/day` requests, and each one fanned out to one ESPN call per competition on a cache miss: up to 182 calls to an unofficial, undocumented API to draw one map. Venues the page didn't know were geocoded in the visitor's browser, one at a time.

So I rebuilt it in steps, each its own pull request, with the site working after every one: move to Workers, add the data layer, rewrite the frontend in React, add saved trips. The decisions are recorded as 20 ADRs in [`docs/adr/`](adr/), and the step order in [`PLAN.md`](PLAN.md).

## Ingestion: only the cron talks to ESPN

The rule that shapes everything: **visitor requests never call ESPN or Photon.** A cron handler copies the data into D1 ahead of time ([ADR 0008](adr/0008-cron-only-ingestion.md)). Pages load from my own database, ESPN sees a steady, predictable trickle of requests, and an ESPN outage means slightly stale data instead of a broken site.

ESPN's scoreboard endpoint rejects date ranges but accepts a single day or a whole month, so the unit of work is a **league-month**: one competition, one month. 26 competitions over a season is 338 of them, kept in an `ingest_queue` table in D1.

Every minute, an **ingest run** does one of two jobs:

**Sweep.** Claim the next due league-month with a single `UPDATE … WHERE rowid IN (SELECT … LIMIT 1) RETURNING`, which leases it for 10 minutes so overlapping runs can't take the same row and a run that dies is retried. Fetch it, compare with what's stored, and write only the fixtures that changed. Moved kick-offs, confirmed times and postponements go into `fixture_changes`. Months close to today are re-queued every few hours, distant ones daily, and failures back off from 15 minutes up to 6 hours.

**Live refresh.** On even minutes, if a competition has a fixture in its kick-off window, re-fetch today's scoreboard for it instead. Scores are at most about two minutes old, and on a quiet weekday no live refresh runs at all.

At the end of a run there's housekeeping: geocode one new venue through Photon (the city first, then the nearest OpenStreetMap stadium within 40 km), and copy up to three new crests from ESPN into R2 so the page serves them from `/img/*`. ESPN gives a venue's name and city but no coordinates. Of the 610 venues so far, 203 couldn't be placed more precisely than their city and are pinned there, which the page flags as "location approximate". A `venue_overrides` table, managed through migrations, fixes the ones that matter.

Over the last 24 hours in production that came to 1,440 ingest runs, 1,660 ESPN calls and 1,948 fixture rows written, 324 of the runs live refreshes, with 17 runs logging an error: ESPN refusing a request (HTTP 403) or Photon briefly down (HTTP 521), each retried later. Every run writes a row to `ingest_runs`, and `/api/status` summarises freshness per competition.

**Why one league-month per run?** Two constraints. First, the Workers Free plan allows 50 subrequests per invocation, and a D1 query counts as one. Each league-month costs three: the fetch, one read of the stored fixtures, and one batch holding every write, including the queue update. Second, D1's free tier allows 100k row writes a day, and going over stops every query until midnight UTC. That's why unchanged rows are never rewritten. I originally planned two or three league-months per run, but production showed two took 47–86 ms of CPU, so it's one.

## Serving: one Worker, mostly from cache

One Worker serves the page, the API, the crests and the trip feeds, and runs the cron ([ADR 0002](adr/0002-one-worker-for-page-api-and-cron.md)). For a project this size, one deployable with one set of bindings is the right level of abstraction. The ingestion code still lives in its own module (`src/ingest/`), separate from the Hono routes (`src/routes/`).

The API is [Hono](https://hono.dev) with Zod validation on every input. The React app imports the API's route types through Hono's RPC client, so a renamed field fails the frontend's typecheck rather than production.

The main endpoint is one call: `/api/fixtures?from=…&to=…` returns every fixture in up to 62 days with teams, crests, score, status and venue coordinates already joined. The page filters by competition, place and search in the browser ([ADR 0013](adr/0013-browsing-filters-in-the-url-and-the-browser.md)), so changing a filter costs no request at all. Where viewing a week once meant up to 182 calls to ESPN, it's now one request that usually never reaches the Worker.

Responses are cached at the edge with `Cloudflare-CDN-Cache-Control` while browsers always revalidate ([ADR 0005](adr/0005-edge-caching-with-workers-cache.md)): 60 seconds when the range touches today, an hour for future ranges, a day for the past. Errors are always `no-store`, so a bad moment upstream is never cached.

## The browser's half

The frontend is Vite, React and TypeScript, with TanStack Query for API data and react-leaflet for the map, clustering and Esri basemaps. Filters live in the URL, so a link shows exactly what the sender saw.

Two things deliberately stay in the browser:

- **The shortlist** lives in `localStorage` as copies of each fixture, refreshed from whatever the page loads, so moved kick-offs show without an account ([ADR 0016](adr/0016-shortlist-kept-in-the-browser.md)).
- **Place search** calls Photon straight from the browser ([ADR 0014](adr/0014-place-search-calls-photon-from-the-browser.md)). It's typed by the visitor, not shared data, and proxying it would only make my Worker a middleman for someone else's API.

Distances and travel times are straight-line estimates: driving up to 600 km, a flight with about three hours of airports beyond that ([ADR 0015](adr/0015-rough-travel-time-estimates.md)). They're labelled as rough, and they're enough to see whether two fixtures on the same weekend can both be made.

## Trips without accounts

"Save trip" turns the shortlist into a trip with a public link, a private edit link and a calendar feed to subscribe to ([ADR 0018](adr/0018-anonymous-trips-with-edit-tokens.md)). There are no accounts, so the design leans on unguessable secrets:

- **Public id:** 10 random URL-safe characters, about 60 bits, so trips can't be enumerated.
- **Edit token:** 32 random bytes. Only its SHA-256 hash is stored, and `PUT /api/trips/{id}` compares hashes with `crypto.subtle.timingSafeEqual`. The edit link carries the token in the URL fragment (`/t/{id}#edit=…`), so it never reaches the server or its logs.
- **Ids, not copies:** a trip stores fixture ids. The trip page and the `.ics` feed join the current fixture details, so when a kick-off moves, subscribers' calendars move with it.

Creating a trip is the only write that needs no token, so it has its own per-IP limit of 10 a minute.

## The edge

The Worker is served only on `footyplanner.co.uk`, with `workers.dev` turned off ([ADR 0019](adr/0019-custom-domain-with-workers-dev-off.md)). That's a security decision more than a cosmetic one: the zone's WAF and rate limiting rules only protect traffic that goes through the zone, and a live `workers.dev` hostname would be a way around all of them.

On the zone ([ADR 0020](adr/0020-edge-security-rules.md)):

- **Rate limiting** on `/api/` and `/t/`: more than 50 requests in 10 seconds from one IP is blocked. A visit makes three API calls on load, so this leaves room for many people behind one shared IP while stopping scripted scraping and floods of trip writes.
- **Allowed methods only:** `GET`, `HEAD`, `POST` and `PUT`. The page shares the API's origin, so browsers never send preflights.
- **Trip writes must be JSON.** The app's client always sends `application/json`, so a form post to the only write endpoint didn't come from the app.
- **Scanner probes** for `.env`, `.git` and CMS logins are refused at the edge instead of reaching the Worker.

These sit in front of the application's own checks, not instead of them: Zod still validates every input, and the Worker has its own per-IP limiters.

## Shipping it

It's a pnpm workspace: `apps/api` (the Worker), `apps/web` (React), `packages/shared` (types and helpers both use, such as distances and the `.ics` builder) and `packages/eslint-plugin`, which holds the repo's own lint rules.

The API and ingestion tests run inside workerd against local D1 and R2 (`@cloudflare/vitest-plugin`), with ESPN and Photon faked from saved responses, so tests never call the real APIs. Playwright runs the main journeys against `wrangler dev` with a seeded database. Changes are built test-first, and each pull request records its failing runs.

GitHub Actions runs format, lint, typecheck, tests, build and Playwright on every pull request, then uploads a preview version and comments its URL. Merging to `main` applies D1 migrations, then runs `wrangler deploy`. Migrations go first so new code never meets an old schema, which means they must stay backwards compatible: the previous version keeps serving until the deploy finishes, and previews share the production database.

## What I'd change next

In rough order of priority:

1. **Get each ingest run under 10 ms of CPU, or pay for the headroom.** The Free plan allows 10 ms per invocation. Production runs use 13–26 ms when idle and about 44 ms when a month is fetched. None has been cut off, because Cloudflare tolerates occasional overruns, but that's not something to rely on. Profiling showed most of it is the fixed cost of starting a fresh isolate on every run, so trimming code can't get there. Workers Paid ($5/month) would let the whole sweep run once an hour, and the queue was designed so that's a config change.
2. **Rotate the live refresh.** A live refresh covers at most six competitions, with no ordering. On a Saturday afternoon more than six can be live, and the same six tend to win. Keeping the cap but taking the oldest refresh first would fix it.
3. **Make the season rollover automatic.** `SEASON_START` in `wrangler.jsonc` has to be bumped by hand each summer. It could be derived from the date.
4. **Alert on ingestion and the write budget.** `/api/status` shows freshness, but nothing tells me when ingestion starts failing, and D1's daily write count isn't visible at all. Since going over stops every query until midnight UTC, it belongs on the status endpoint next to an alert.

## Wrap-up

For a small project, putting everything on one platform was the right call. One Worker, one database and one bucket means one place for DNS, secrets, logs and deploys, and the edge cache and security rules come with the zone instead of being bolted on. Moving the ESPN calls out of the request path and into a queue-driven cron matters most: the site depends on my database being reasonably fresh, not on an unofficial API answering right now.

The cost is a design shaped by the Free plan's limits. One league-month a minute, a full sweep taking hours, and CPU numbers that are tolerated rather than within budget. The next step is deciding whether to keep engineering around those limits or pay $5 a month to remove them. The code is ready for either.
