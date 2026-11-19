# 0018. Anonymous saved trips with edit tokens

- Status: Accepted
- Date: 2026-11-19

## Context

The shortlist lives in one browser ([ADR 0016](0016-shortlist-kept-in-the-browser.md)). Step 4 saves it as a trip: a link anyone can open, an edit right for whoever made it, and a calendar feed that follows moved kick-offs ([decision 22 in the plan](../PLAN.md#decisions)). There are no accounts (decision 7), so editing has to rest on something the owner holds.

Visitors' writes are new for footyplanner. Until now only the cron wrote to D1, which allows 100k row writes a day on the Free plan and stops every query until 00:00 UTC once that's spent.

## Decision

- **A trip is the shortlist, saved.** One shortlist per browser, linked to at most one trip. The page (step 4b) creates it with "Save trip" and then saves every shortlist change to it.
- **The server stores fixture ids, not copies.** `trips.fixture_ids` is a JSON list of 1–50 unique ids, all listed fixtures when saved, plus an optional name of up to 60 characters. `GET /api/trips/{id}` and the feed join the current fixture details through the same query as `/api/fixtures`. Ids ESPN no longer lists come back under `missing` and are left out of the feed. 50 ids stay well under D1's 100 bound parameters.
- **Public id: 10 random URL-safe characters** (about 60 bits, the table's primary key), so trips can't be found by guessing.
- **Edit token: 32 random bytes, base64url.** Only its SHA-256 hash is stored. `PUT` needs it as `Authorization: Bearer <token>` and compares the hashes with `crypto.subtle.timingSafeEqual`. A plain hash is enough because the token is random, not a password. In step 4b the browser keeps `{ id, editToken }` under `fp:trip`, and the private edit link carries the token in the hash fragment (`/t/{id}#edit=…`), so it never reaches the server or its logs.
- **In the page**, opening the edit link loads the trip into that browser's shortlist and removes the token from the address bar. If the shortlist there holds other fixtures, it asks first. Opening your own trip's public link goes straight to your shortlist. "Copy to my shortlist" on someone else's trip asks before replacing a non-empty shortlist, and unlinks any trip you'd saved, which stays as it was. `fp:trip` also remembers the ids last saved, so loading the page doesn't send a `PUT`.
- **`PUT` replaces the whole trip**, so retrying a save is safe. There is no delete, and trips aren't expired: expiring one would quietly break calendar subscriptions.
- **Creating trips has its own rate limit**, `TRIP_LIMITER` at 10 a minute per IP, on top of the 120 a minute for `/api/*`. It's the only write that doesn't need a token, and each one costs D1 writes.
- **`GET /api/trips/{id}` is never cached**, so the owner sees their latest save. **`/t/{id}.ics` is cached for 15 minutes at the edge** and asks calendar apps to refresh hourly (`REFRESH-INTERVAL`, `X-PUBLISHED-TTL`), named after the trip (`X-WR-CALNAME`). Its events use the same UIDs as the shortlist's downloaded `.ics` (`buildIcs`, now in `packages/shared`).
- **`/t/*` runs the Worker first.** `/t/{id}.ics` is the feed. `/t/{id}` serves the app's `index.html` through the `ASSETS` binding when the trip exists, and the Worker's 404 when it doesn't, so unknown paths stay real 404s ([ADR 0017](0017-react-app-replaces-the-legacy-page.md)).

## Alternatives considered

- **Store fixture copies, as the browser does.** The feed and the shared page would show the kick-offs from when the trip was saved, which is what the feed exists to avoid.
- **A `trip_fixtures` join table.** Only useful for queries across trips, such as "trips containing this fixture", which nothing needs.
- **Accounts or magic links.** More than an anonymous trip planner needs now. It's under Later in the plan.
- **Single-page-app fallback for unknown paths.** No Worker invocation for `/t/{id}`, but every typo would get the map with a 200, and the `.ics` route would need a separate pattern.
- **A slow password hash (PBKDF2, scrypt).** Protects guessable secrets. A 256-bit random token can't be guessed, and a slow hash would cost CPU against the 10 ms limit on every save.

## Consequences

- Anyone with the public link can see the trip and subscribe to it. Anyone with the edit link can change it, and a lost edit token can't be recovered.
- Trips grow without limit. At about 1 KB a row that's no concern for D1's 5 GB, but a delete (with the token) may be wanted later.
- Each trip page view and each uncached feed request is one Worker invocation with two or three D1 queries.
- A fixture that's moved shows its new kick-off on the trip page at once, and in subscribed calendars within about an hour plus the calendar app's own polling.
