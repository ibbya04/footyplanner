# 0017. The React app replaces the legacy page at `/`

- Status: Accepted
- Date: 2026-11-19

## Context

[ADR 0012](0012-react-frontend-built-alongside-the-legacy-page.md) built the React app at `/next/` while the legacy `index.html` stayed at `/`. Steps 3a–3d brought browsing, near a place and the shortlist across, so step 3e moves the React app to `/` and removes what only the legacy page used.

The legacy page used two endpoints that call upstream services on a visitor's request: `/api/day` proxied ESPN for one day, and `/api/venue` looked up a stadium on Photon. They are the last exceptions to "visitor requests never call ESPN or Photon" ([ADR 0008](0008-cron-only-ingestion.md)).

The legacy page shared its view as a hash link (`#d=from_to&c=slugs&n=lat,lng,radius,name&s=fixtureIds`). The React app keeps filters in query parameters ([ADR 0013](0013-browsing-filters-in-the-url-and-the-browser.md)), so it doesn't read those links.

## Decision

- **Vite builds the React app to `/`** (`base` left at its default, output in `apps/web/dist`). `apps/web/legacy/` and the build step that copied it are deleted.
- **`/api/day` and `/api/venue` are removed**, with their tests and `slimEvent` in `packages/shared`, which only `/api/day` used. They now answer the Worker's 404. The Photon lookup in `geocode.ts` stays for the cron's venue geocoding.
- **Legacy hash links aren't translated.** An old link opens the React app with no filters. A shared shortlist (`s=`) comes back as step 4's saved trips.
- **`/next/` isn't redirected.** Only previews and testing used it, so it returns 404 like any other unknown path.
- **The legacy `fp:*` keys in visitors' `localStorage` are left in place.** Nothing reads them, and deleting them would be code on every page load for a few kilobytes.
- Legacy features the React app doesn't have yet (the map style picker, "Fit matches", the competition legend on the map) are follow-ups in `docs/PLAN.md` rather than blockers.

## Alternatives considered

- **Translate `#d=…&c=…&n=…` links into query parameters on load.** Keeps old shared links working, but nobody is known to depend on them, and it's code kept forever for a page that's gone.
- **Redirect `/next/` to `/`.** Only worth it if `/next/` links were shared outside testing. They weren't.
- **Keep `/api/day` and `/api/venue` for a while.** Nothing calls them once the legacy page is gone, and they let visitors trigger ESPN and Photon calls.
- **Clear the legacy `localStorage` keys.** Small gain for code that has to run on every visit.

## Consequences

- Every visitor gets the React app. The JavaScript bundle (about 136 KB gzipped, [ADR 0012](0012-react-frontend-built-alongside-the-legacy-page.md)) now loads at `/`.
- The Worker no longer calls ESPN or Photon on a visitor's request, so upstream outages and rate limits only affect the cron.
- Old `#…` share links and `/next/` links stop showing what they used to.
- Unknown paths still return the Worker's 404. Step 4's `/t/{id}` page decides whether to add a single-page-app fallback.
