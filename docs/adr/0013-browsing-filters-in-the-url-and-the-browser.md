# 0013. Browsing filters live in the URL and run in the browser

- Status: Accepted
- Date: 2026-11-19

## Context

Step 3b rebuilds browsing: a date range, competitions, a day, search, venue or local time, and "only fixtures in map view". In the legacy page these sat in a global `state` object, persisted to `localStorage`, and shared through `#d=…&c=…` links. The rules that decide which day a fixture belongs to and what's shown about it (venue time zone, TBC fixtures keeping ESPN's calendar date, TBC guidance) were spread across the render functions.

`/api/fixtures` accepts up to 62 days and up to 40 competitions per request, and every response is cached at the edge keyed on its query string.

## Decision

- **One deep module decides what's shown.** `viewFixtures(fixtures, competitions, filters, { today, myZone })` in `apps/web/src/browse/` returns the day counts and the fixtures to show, each with its competition, display day, kick-off text, TBC guidance and whether its venue is only city-level. The map and the list both render its output, so they always agree. It's pure and tested directly.
- **The URL is the only source of filter state.** `readFilters` and `writeFilters` turn query parameters (`from`, `to`, `comps`, `day`, `q`, `tz=mine`, `in=map`) into filters and back, dropping anything unknown or malformed. A clean URL means no filters: every competition, the next 7 days, venue time. An empty `comps=` means no competitions, the "None" choice. No filter is remembered in `localStorage` between visits (only the sidebar width is, as a per-browser preference), and legacy `#d=…` links aren't read. A `day` in the URL is kept even when it falls just after the range, because with "My time" a late kick-off can land on the following day.
- **Every competition is fetched, and competitions are filtered in the browser.** `/api/fixtures` is called once per date range without `comps`, which now means every active competition, so toggling a competition doesn't refetch, there's one edge-cache entry per range instead of one per selection, and the API's 40-competition limit never applies.
- **Ranges are capped at 62 days**, the API's limit, so one request always covers the range. The legacy page capped at 31 days because each day cost one ESPN call per competition; that cost is gone.
- The map's visible area is React state, not URL state: only the "in map view" switch is shared.

## Alternatives considered

- **Remember the last filters in `localStorage`**, as the legacy page did. Rejected: a clean URL should show everything, and a link should show exactly what it says.
- **Read legacy share links.** Rejected as not worth carrying; the legacy page is a preview-era tool.
- **Fetch only the chosen competitions.** Smaller responses, but a refetch on every toggle and a split edge cache.
- **Split long ranges into several 62-day requests.** Unneeded once the picker stops at 62 days.

## Consequences

- A week of every competition is about 140 fixtures in one response, which is small.
- Any filter combination can be shared or bookmarked by copying the address bar.
- Filter rules have one test surface: Vitest tests on `viewFixtures` and the URL format, and Playwright journeys for the wiring.
- Each Playwright test sends its own `CF-Connecting-IP` (`apps/web/e2e/test.ts`) so the local rate limiter doesn't trip across the suite; Cloudflare overwrites the header in production.
