# 0015. Rough travel-time estimates from straight-line distance

- Status: Accepted
- Date: 2026-11-19

## Context

Near a place, each fixture shows how far it is and roughly how long it takes to get there. Step 3d's itinerary needs the same estimate between consecutive shortlisted fixtures to warn about clashes. The legacy page worked these out in `index.html` from straight-line distance, with its reasoning in code comments. Comments aren't allowed in this repo, so the reasoning lives here.

## Decision

The helpers live in `packages/shared/src/travel.ts`, unchanged from the legacy page and pinned by unit tests:

- **Distance** is the great-circle distance (`distanceKm`), shown with one decimal under 10 km and in whole kilometres above.
- **Up to 600 km, you drive.** Road distance is the straight line × 1.3. The average speed grows with the trip: 40 km/h under 40 km of road (city traffic), 70 km/h up to 150 km, 90 km/h beyond. The result is rounded to 5 minutes and is never under 5.
- **Beyond 600 km (`FLY_KM`), you fly.** Three hours door to door for airports, security and transfers, plus the flight at 750 km/h, rounded to 15 minutes.
- **Under 1 km** is the same stadium.
- Labels: cards show `47 km · ≈50 min` (adding "by air" past 600 km); map popups spell it out, e.g. `47 km · ≈50 min drive from Liverpool` or `1442 km · ≈5h door to door by air from Liverpool`. Cards carry the hint "Straight-line distance; travel time is a rough estimate".

## Alternatives considered

- **A routing API** (OSRM, Google, Mapbox) for real road times. Every fixture in the list would need a route, from the browser or through the Worker, adding cost, rate limits and a dependency for a figure that only needs to say "an hour" or "a day trip".
- **Public transport times.** No free source covers Europe consistently.
- **Retuning the numbers.** Not needed for parity; they can change later with the tests updated to match.

## Consequences

- Estimates are fast, offline and consistent between the list, the map and (in step 3d) the itinerary.
- They can be well off where roads bend around water or mountains, or where a train is faster than driving, which is why they're marked as rough.
