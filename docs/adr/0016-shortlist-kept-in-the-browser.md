# 0016. Shortlist kept in the browser as fixture copies

- Status: Accepted
- Date: 2026-11-19

## Context

Step 3d adds the shortlist: a visitor stars fixtures and gets an itinerary with travel between them, clash warnings, a route on the map, a calendar export and directions links. There are no accounts ([decision 7 in the plan](../PLAN.md#decisions)), and saved trips with share links and a live `.ics` feed are step 4.

The browser only holds the fixtures for the dates on screen (`/api/fixtures`, at most 62 days). A starred fixture has to stay on the shortlist after the visitor moves to other dates, turns its competition off or reloads.

The legacy page kept its shortlist in `localStorage` under `fp:starred`, as copies in its own shape. The React app doesn't need to read them: the legacy page is going away in step 3e and nobody depends on carrying a shortlist across.

## Decision

- **The shortlist lives in `localStorage` under `fp:shortlist`**, as a list of `Fixture` objects in the API's own shape (`apps/web/src/shortlist/store.ts`). The legacy `fp:starred` key isn't read, and existing legacy shortlists don't carry over.
- **Each entry is a full copy of the fixture**, so the shortlist renders without a request, whatever dates or competitions are chosen.
- **Copies are refreshed from whatever fixtures the page loads.** When `/api/fixtures` returns a starred fixture with different details (a moved kick-off, a confirmed time, a score), the copy is replaced. Unchanged lists aren't rewritten.
- **Stored data is checked with Zod on read.** Invalid JSON, entries that aren't fixtures, and blocked or full storage leave an empty or shorter shortlist instead of breaking the page.
- **The itinerary, clash warnings and `.ics` file are worked out in the browser** from the saved copies (`itinerary.ts`, `ics.ts`). Clash rules match the legacy page: kick-offs under 5 minutes apart are the same time, under 2 hours overlap, a fixture is taken to last 2 hours, and under an hour to spare after travel is tight. Travel times come from [ADR 0015](0015-rough-travel-time-estimates.md).
- The shortlist tab is React state, not part of the URL: [ADR 0013](0013-browsing-filters-in-the-url-and-the-browser.md) keeps the URL for filters that make a shareable view, and sharing a shortlist is step 4's saved trips.

## Alternatives considered

- **Store only fixture ids and fetch the rest.** Smaller storage, never stale, but `/api/fixtures` takes a date range, not ids, so a shortlist spread over months would need several range requests or a new endpoint. Copies render instantly and offline.
- **Read the legacy `fp:starred` copies.** Would have meant a converter from the legacy shape (different field names, competition slugs, a separate location object) for a page that's being removed. Not worth it.
- **Keep the shortlist on the server now.** That's step 4 (saved trips with an edit token). The shortlist stays useful without it.

## Consequences

- A shortlist is tied to one browser. Clearing site data loses it, and it doesn't follow the visitor to another device until step 4.
- Copies of fixtures outside the dates on screen aren't refreshed until the visitor browses to those dates, so a kick-off moved meanwhile shows its old time on the shortlist.
- `localStorage` holds about 1 KB per fixture, far below browser limits for a trip's worth of fixtures.
- Step 4 can move `ics.ts` into `packages/shared` for the `/t/{id}.ics` feed, and seed a saved trip from the stored copies.
