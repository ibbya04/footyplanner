# 0014. Place search calls Photon from the browser

- Status: Accepted
- Date: 2026-11-19

## Context

Step 3c adds "Near a place": a visitor types a city, hotel or address, picks a suggestion, and the list narrows to fixtures within a radius of it. Turning typed text into coordinates needs a geocoder. The legacy page called [Photon](https://photon.komoot.io) (komoot's public OpenStreetMap geocoder) straight from the browser: 250 ms after the last keystroke, 6 results, biased towards the map centre. The cron already uses the same Photon instance to locate venues ([ADR 0010](0010-venues-geocoded-in-cron-with-overrides.md)).

The rule since [ADR 0008](0008-cron-only-ingestion.md) is that the Worker never calls ESPN or Photon while serving a visitor. On the Free plan every Worker request and every subrequest counts against daily and per-invocation limits.

## Decision

- **The browser calls Photon directly.** `usePlaces` in `apps/web/src/near/` sends `q`, `limit=6` and the map centre rounded to 0.1° (`lat`, `lon`) after a 250 ms pause, from 2 characters typed. Answers are cached by TanStack Query for the life of the page, so retyping a query doesn't call Photon again.
- **The response is checked and trimmed in the browser.** `parsePlaces` validates the GeoJSON with Zod, labels each place the legacy way (name, else street and house number, else city; then city, region and country), and drops places with nothing to call them and places outside the UEFA region, since no fixture is played there.
- **No `/api/places` endpoint.** The Worker's rule stays as it is: it never fetches upstream data on a visitor's request.
- A failed or malformed answer shows "Place search is unavailable right now" in the suggestions; the rest of the page is unaffected.
- "My location" uses the browser's Geolocation API and doesn't call Photon.

## Alternatives considered

- **A cached `/api/places` proxy.** It would give a typed Hono RPC response, server-side filtering, our own rate limit, and would hide visitors' IP addresses from komoot. Rejected because:
    - Every search becomes a Worker request plus a Photon subrequest, against the Free plan's daily request budget, and it breaks the rule that visitor requests never reach upstream.
    - Every visitor's searches would come from Cloudflare's IP addresses, so if Photon throttled those, place search would fail for everyone at once. From the browser, the load is spread across visitors' own addresses, as Photon's fair-use policy expects.
    - The edge cache would rarely hit: partial input ("Manc", "Manche") and hotel or address searches are too varied.
- **Self-hosting a geocoder.** Far more than a trip-planning map needs.

## Consequences

- Photon (komoot) sees the visitor's IP address and what they typed. The page credits OpenStreetMap and Photon; the privacy trade-off is accepted for an anonymous, account-free site.
- Place search costs nothing on the Cloudflare plan.
- Changing geocoder means changing frontend code (`apps/web/src/near/`).
- Playwright fakes Photon with `page.route` and a saved response in `apps/web/e2e/photon/`, so tests never call it.
