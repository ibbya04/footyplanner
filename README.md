# footyplanner

A single-page map of the football matches on across Europe for a set of dates. You can use it to see which games you could get to while travelling.

It runs on Cloudflare Workers. A cron job pulls fixtures from ESPN into a D1 database every minute, locates stadiums on OpenStreetMap and copies crests into R2; the API serves from D1 and is cached at Cloudflare's edge. No API keys. The rebuild is under way one step at a time: see [docs/PLAN.md](docs/PLAN.md) and the decision records in [docs/adr/](docs/adr/).

## How it works

- **Fixtures** come from ESPN's public scoreboard API (`site.api.espn.com/.../soccer/{league}/scoreboard?dates=YYYYMMDD`). This is an unofficial endpoint: it needs no key and allows browser requests (CORS), but it could change without notice. It only accepts a single day (date ranges return 400), so the page makes one request per competition per day. Each day is cached in `localStorage`: 10 min around today, so live scores update, 6 h for future days and 7 days for finished ones.
- **Stadium locations:** ESPN gives the venue name, city and country, but no coordinates.
    - Most stadiums come from the `KNOWN_VENUES` table built into the page, so their pins appear instantly.
    - Any other venue is looked up with [Photon](https://photon.komoot.io) (OpenStreetMap). The city is found first, so the match gets a pin right away (dashed border), and the pin then moves to the exact ground once it's found within 40 km. If the ground can't be found, the pin stays on the city. Lookups are cached in `localStorage` permanently.
- **Kick-off times** use the stadium's time zone, worked out from its country, with your own time shown next to it. The view options menu (top right of the panel) switches between stadium time and your own.
- **Map tiles** come from Esri basemaps, which need no key and also work when the page is opened as a local file.

## Planning a trip

- **Near:** tap the place button next to the dates, then type a city, hotel or address, or use your current location. Then pick a distance (25–400 km). Only matches within that circle are listed, each with its distance and a rough travel time. Driving is estimated from straight-line distance; beyond 600 km it assumes a flight with about 3 hours of airports. You can sort by time or distance.
- **Shortlist:** tap ☆ on any match or map popup.
    - The Shortlist tab lists your picks as a day-by-day itinerary with travel between games. It warns about same-time kick-offs, overlaps, and trips you can't make between the final whistle and the next kick-off. The route is drawn on the map.
    - "Add all to calendar" downloads an `.ics` file. Matches without a confirmed time become all-day events marked "time TBC".
    - "Copy share link" puts your dates, competitions, place and shortlist in the link.
    - Saved matches keep updating. If a kick-off moves, or a TBC time gets confirmed, the shortlist flags it.
- **Unconfirmed kick-offs:** when a time is still TBC, the page shows when that league usually confirms times (for example, the Premier League about 5–6 weeks ahead and La Liga only 1–3 weeks ahead) and the expected date. It also notes that the match can move to another day of that weekend for TV. These are rules of thumb, not guarantees.

## Ingestion

A Cron Trigger runs the Worker every minute (`apps/api/src/ingest/run.ts`). The Workers Free plan gives each run 10 ms of CPU and 50 subrequests (fetches, D1 queries and R2 calls all count), so each run does a little:

- **Sweep:** claims the next due league-months from `ingest_queue` (1 per run, `INGEST_MONTHS_PER_RUN`) and fetches each from ESPN with `scoreboard?dates=YYYYMM`, one call per month. Only fixtures that changed are written. Moved kick-offs, confirmed times and postponements are logged in `fixture_changes`. Fixtures ESPN stops listing are marked removed. Near months are re-fetched every few hours, finished months weekly.
- **Live:** on even minutes, competitions with a match in the last 3 hours or the next 10 minutes get today re-fetched instead, so scores are at most about 2 minutes old.
- **Venues:** one new stadium per run is located on [Photon](https://photon.komoot.io) (OpenStreetMap): the city first, then the nearest stadium within 40 km. `venue_overrides` holds hand-checked locations that always win.
- **Images:** three crests or league logos per run are copied from ESPN into R2 and served from `/img/...`.

Every run is logged in `ingest_runs`, and `/api/status` summarises freshness per competition. ESPN's scoreboard API is unofficial and undocumented; if it changes, `/api/status` shows the errors.

## Competitions and venues

Competitions, venues and overrides live in D1. The first seed came from the tables the page used to hard-code. To add a competition, add a migration that inserts a row into `competitions` (an ESPN league slug such as `ned.1`); the next hourly run queues its months. To fix a stadium pin, add a row to `venue_overrides`.

## Repo layout

```
apps/api/            Cloudflare Worker (Hono): API routes, cron ingestion, wrangler.jsonc
  src/db/            Drizzle schema
  src/ingest/        the cron job: parse, diff, queue, venues, images
  src/routes/        /api/* and /img/*
  migrations/        D1 migrations (schema from drizzle-kit, plus seed data)
  test/              Vitest, run inside the Workers runtime with local D1 and R2
apps/web/legacy/     the current single-page app, served as static assets
packages/shared/     code used by both: API response types, ESPN types, distance and region checks
```

It's a pnpm workspace. Install with `pnpm install` (Node 22+; `corepack enable` gives you pnpm if you don't have it).

## API

The Worker only runs for `/api/*` and `/img/*`; everything else is served straight from the static assets. Responses are cached at Cloudflare's edge (Workers Cache, via `Cloudflare-CDN-Cache-Control`), and requests that miss the cache are rate-limited per IP (120 a minute).

- **`/api/fixtures?from=YYYY-MM-DD&to=YYYY-MM-DD&comps=eng.1,esp.1,…`** every fixture in the range (whole UTC days, up to 62) from D1, with teams, crests, score, status and venue coordinates. Cached for 60 s when the range touches today, an hour for future ranges and a day for past ones.
- **`/api/competitions`** the competitions, their groups and colours, logos and TBC guidance.
- **`/api/status`** the last cron run and, per competition, how many months have been fetched, when last and whether any are failing.
- **`/img/teams/<id>.png`, `/img/leagues/<slug>.png`** crests and logos from R2.

The legacy page still uses two older endpoints, which go in step 3:

- **`/api/day?date=YYYY-MM-DD&comps=eng.1,esp.1,…`** fetches every requested competition for one day from ESPN in a single response, cut down to the fields the page uses, and edge-cached: about 2 minutes around today (live scores), 3 hours for future days and a week for finished ones. A two-week window takes about 15 requests instead of about 120.
- **`/api/venue?name=&city=&country=`** looks up a stadium on Photon once and caches the answer at the edge for 30 days.

Errors and bad requests are sent with `Cache-Control: no-store` so they're never cached. The page detects the backend automatically. When it's opened as a file or the API fails, it calls ESPN and Photon directly as before.

## Development

```
pnpm dev            # wrangler dev on http://localhost:8787 (page + API)
pnpm test           # Vitest; the API tests run inside the Workers runtime
pnpm typecheck
pnpm lint
pnpm format         # Prettier
```

After changing `apps/api/wrangler.jsonc`, run `pnpm --filter @footyplanner/api types` to regenerate `worker-configuration.d.ts`.

The local database starts empty. From `apps/api`:

```
pnpm db:migrate:local                 # create tables and seed data in the local D1
pnpm exec wrangler dev --test-scheduled
curl "http://localhost:8787/__scheduled?cron=*+*+*+*+*"   # run the cron once
```

After changing `src/db/schema.ts`, run `pnpm db:generate` to write a migration, then `pnpm db:migrate:local`.

## Deploying (Cloudflare)

GitHub Actions (`.github/workflows/ci.yml`) checks formatting, lint, types and tests on every pull request and push. Pull requests also upload a preview version (`pr-<number>-footyplanner.<account>.workers.dev`) and comment the link. Pushes to `main` apply D1 migrations, then deploy with `wrangler deploy`. Migrations have to stay backwards compatible (add columns and tables, don't rename or drop), because the previous version keeps serving until the deploy finishes, and preview versions share the production database.

The deploy jobs need two repository secrets:

- `CLOUDFLARE_ACCOUNT_ID`: from the Cloudflare dashboard (Workers & Pages, right-hand side).
- `CLOUDFLARE_API_TOKEN`: create one with the "Edit Cloudflare Workers" template, and add **D1: Edit** to its permissions for migrations.

To deploy by hand: `pnpm exec wrangler login` once, then `pnpm deploy`.
