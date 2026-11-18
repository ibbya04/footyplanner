# 0010. Venues geocoded in the cron, with overrides

- Status: Accepted
- Date: 2026-11-18

## Context

ESPN gives each venue's name, city and country, but no coordinates. Before, the page had 259 stadiums hard-coded (`KNOWN_VENUES`, refreshed by hand with a Python script). Any other venue was looked up from the visitor's browser on Photon (OpenStreetMap), or through `/api/venue`. Lookups sometimes go wrong: ESPN lists Monaco as being in France, and Photon then matches a village called Monaco in Haute-Marne.

## Decision

- Venues are a D1 table keyed like the page's `venueKey()`: `name|city|country`, lowercase. The 259 known stadiums were seeded from the page.
- Ingestion inserts unseen venues as pending. Each cron run locates **one** on Photon with the same strategy as before (the city, rejecting anything outside UEFA's region, then the nearest `leisure:stadium` within 40 km), well inside Photon's fair-use limit.
- A venue that can't be found is retried after 1, 2, 3… weeks, up to a month. A Photon error is retried after an hour.
- `venue_overrides` holds hand-checked locations. They're never geocoded, and `/api/fixtures` uses them ahead of anything stored. Stade Louis II is the first.
- `scripts/build_venues.py` is deleted.

## Alternatives considered

- **Keep geocoding in the browser.** Every visitor repeats the same lookups, and Photon sees traffic that grows with users.
- **Keep `/api/venue` with an edge cache.** Shared between visitors, but still triggered by them, and the result isn't stored anywhere the fixtures query can join.
- **A paid geocoder** (Google, Mapbox). Better coverage of small grounds, but an API key and costs for a few hundred lookups a season.

## Consequences

- Every fixture from `/api/fixtures` comes with coordinates once its venue is located. The browser never geocodes.
- In the first local run against real ESPN, 156 of the 259 seeded venues matched ESPN's names exactly, and about 80 new venues appeared (lower-league FA Cup grounds, Copa del Rey grounds, national stadiums). At one per minute, a backlog like that clears in under 2 hours.
- A fixture can have a venue with no coordinates for a while. The API returns `lat: null` and the page has to cope.
- Fixing a bad pin is one row in `venue_overrides`, added by migration.
