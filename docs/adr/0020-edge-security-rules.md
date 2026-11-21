# 0020. Edge security rules on the zone

- Status: Accepted
- Date: 2026-11-21

## Context

Since [ADR 0019](0019-custom-domain-with-workers-dev-off.md), every request reaches footyplanner through the `footyplanner.co.uk` zone, so rules there run before the Worker. Cloudflare's proxy already gives TLS, network and HTTP DDoS protection and the edge cache, but it judges traffic in aggregate: a single malicious request, or one client scraping steadily, is too small to register as an attack.

What the site exposes:

- Static files (`/`, `/assets/*`), served without running the Worker.
- The API: `GET /api/fixtures`, `/api/competitions`, `/api/status`, and `POST /api/trips`, `GET`/`PUT /api/trips/{id}`, the only writes from visitors ([ADR 0018](0018-anonymous-trips-with-edit-tokens.md)).
- `/t/{id}` and `/t/{id}.ics`, and crests at `/img/*`.
- Any other path, which falls through to the Worker and gets its JSON 404. Static assets only skip the Worker for files that exist.

The application already defends itself. Zod validates every parameter and body against strict formats, and Drizzle sends values to D1 as bound parameters, so SQL injection payloads are rejected before a query runs and would be treated as data if they weren't. `API_LIMITER` (120 a minute) and `TRIP_LIMITER` (10 trip creations a minute) limit each IP inside the Worker. The Free plan has no configurable managed rulesets: the Cloudflare Managed Ruleset and OWASP Core Ruleset, which carry SQL injection and XSS signatures, need a paid plan.

## Decision

Add edge rules that turn away abusive or malformed requests before they reach the application, as a layer in front of its own checks. They're set in the Cloudflare dashboard on the zone, not in the repo, so they're recorded here.

**Rate limiting rule: `API and trips per IP`**

```
(starts_with(http.request.uri.path, "/api/") or starts_with(http.request.uri.path, "/t/"))
```

More than 50 requests in 10 seconds from one IP is blocked for 10 seconds. A visit makes 3 API calls on load and one every 2 minutes, so the threshold leaves room for many visitors behind one shared IP while stopping scripted scraping of the fixture data and floods of trip writes. `/img/*` is left out because one map load requests dozens of crests, and rate limiting counts requests the edge cache answers. Static files are left out because they never reach the application.

**Custom rules**, each with the action Block:

1. **Allowed methods only.** The API uses nothing else, and the page shares the API's origin, so browsers never send `OPTIONS` preflights.

    ```
    not (http.request.method in {"GET" "HEAD" "POST" "PUT"})
    ```

2. **Trip writes must be JSON.** The page's Hono client always sends `Content-Type: application/json`, so a form post or raw body to the only write endpoint didn't come from the app.

    ```
    (http.request.uri.path eq "/api/trips" or starts_with(http.request.uri.path, "/api/trips/"))
    and http.request.method in {"POST" "PUT"}
    and not any(http.request.headers["content-type"][*] contains "application/json")
    ```

3. **Block scanner probes.** Paths that automated scanners try for leaked secrets, repositories and CMS logins. None exist here, so they're refused at the edge instead of reaching the Worker.

    ```
    starts_with(http.request.uri.path, "/.env")
    or starts_with(http.request.uri.path, "/.git")
    or starts_with(http.request.uri.path, "/wp-")
    or http.request.uri.path eq "/xmlrpc.php"
    or starts_with(http.request.uri.path, "/phpmyadmin")
    ```

**Bot Fight Mode stays off.** It challenges automated clients, and calendar apps fetching `/t/{id}.ics` are automated. The Free plan can't exempt paths from it.

The Worker's limiters stay: they apply per route and keep working if a request reaches the Worker another way, such as a preview URL.

## Alternatives considered

- **Rely on the application alone.** Validation and bound parameters are the real defence against injection, but every abusive request would still run code. Turning malformed and abusive traffic away at the edge keeps it away from the application entirely.
- **Rate limit every path except `/`, `/assets/*` and `/img/*`.** Covers made-up paths too. Rejected: probe paths are covered by rule 3, and the rate limit is aimed at the endpoints that do work.
- **Signature rules for SQL injection in custom rules,** e.g. blocking query strings containing `union select`. Easy to get around and prone to false positives. Proper signatures come with the paid managed rulesets, which can be added on top of these rules if the plan changes.
- **Bot Fight Mode.** Breaks calendar subscriptions, as above.

## Consequences

Tested against production on 2026-11-21:

| Request                                                     | Result                                                                                               |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 70 requests to `/api/status` from 10 parallel connections   | 49 × 200, then 21 × 429 from Cloudflare (`error code: 1015`, plain text); 200 again after 12 seconds |
| `DELETE /api/status`                                        | 403, Cloudflare block page                                                                           |
| `POST /api/trips` as `text/plain`                           | 403, Cloudflare block page                                                                           |
| `POST /api/trips` as JSON with no fixtures                  | 400 from the Worker: passes the rules, nothing written                                               |
| `GET /.env`, `/.git/config`, `/wp-login.php`                | 403, Cloudflare block page                                                                           |
| `GET /`, `GET /api/fixtures?from=…&to=…`                    | 200                                                                                                  |
| `GET /foo`                                                  | 404 JSON from the Worker                                                                             |
| `/api/fixtures?from=2026-11-21' OR 1=1--`                   | 400 from Zod (`from must be YYYY-MM-DD`)                                                             |
| `/api/fixtures?…&comps=eng.1') UNION SELECT * FROM trips--` | 400 from Zod (`comps must be 1-40 ESPN league slugs`)                                                |
| `/api/trips/' OR '1'='1`                                    | 404 from the Worker                                                                                  |

- Blocks from the edge come back as Cloudflare HTML or plain text with `server: cloudflare`, while the Worker always answers in JSON, so it's clear which layer refused a request.
- The rules live in the dashboard. Changing one means updating this ADR, and setting up another copy of the site means adding them by hand.
- Visitors on one shared IP making more than 50 API calls in 10 seconds between them get blocked for 10 seconds.
- Probes outside rule 3's list and other unknown paths still reach the Worker, which answers with a JSON 404.
