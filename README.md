# footyplanner

A single-page map of the football matches on across Europe for a set of dates. You can use it to see which games you could get to while travelling.

It runs on Cloudflare Workers: the page is a static asset and a small API in front of ESPN and Photon is cached at Cloudflare's edge. No API keys. A rebuild onto D1, scheduled ingestion and React is under way, one step at a time.

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

## Competitions

To add or remove a competition, edit the `COMPETITIONS` list in `apps/web/legacy/index.html`. Each entry is an ESPN league slug, for example `ned.1` or `eng.fa`. "Big 5 + UEFA" is the default selection, and you can turn on more from the Leagues button above the match list.

## Updating the stadium list

Run this from the repo root (Python 3, no extra packages) roughly once a season, or after adding competitions:

```
python3 scripts/build_venues.py
```

It collects every team's home ground for each competition in the page, plus the venues on the scoreboard for the next 14 days. It looks up the new ones on Photon and rewrites the `KNOWN_VENUES` block. Venues already in the table are kept, so re-runs are quick. `--refresh` looks everything up again, and `--days N` changes how many days ahead it scans.

## Repo layout

```
apps/api/          Cloudflare Worker (Hono): /api/* routes, wrangler.jsonc, tests
apps/web/legacy/   the current single-page app, served as static assets
packages/shared/   code used by both: ESPN types and trimming, distance and region checks
scripts/           build_venues.py
```

It's a pnpm workspace. Install with `pnpm install` (Node 22+; `corepack enable` gives you pnpm if you don't have it).

## API

The Worker only runs for `/api/*`; everything else is served straight from the static assets.

- **`/api/day?date=YYYY-MM-DD&comps=eng.1,esp.1,…`** fetches every requested competition for one day from ESPN in a single response, cut down to the fields the page uses. Cloudflare's edge caches it (Workers Cache, via `Cloudflare-CDN-Cache-Control`) and shares it between all visitors: about 2 minutes around today (live scores), 3 hours for future days and a week for finished ones. A two-week window takes about 15 requests instead of about 120.
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

## Deploying (Cloudflare)

GitHub Actions (`.github/workflows/ci.yml`) checks formatting, lint, types and tests on every pull request and push. Pull requests also upload a preview version (`pr-<number>-footyplanner.<account>.workers.dev`) and comment the link. Pushes to `main` deploy with `wrangler deploy`.

The deploy jobs need two repository secrets:

- `CLOUDFLARE_ACCOUNT_ID`: from the Cloudflare dashboard (Workers & Pages, right-hand side).
- `CLOUDFLARE_API_TOKEN`: create one with the "Edit Cloudflare Workers" template.

To deploy by hand: `pnpm exec wrangler login` once, then `pnpm deploy`.
