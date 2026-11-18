# 0004. Hono and Zod for the API

- Status: Accepted
- Date: 2026-11-18

## Context

A Worker receives every request in one `fetch(request)` function. The API has two routes now and about six after step 4. The old Vercel functions checked query parameters with hand-written `if` statements and regular expressions, separately from any types. The React app (step 3) should call the API with checked types, so a change to a response shape breaks the build rather than the page.

## Decision

- **Hono** for routing, middleware and error handling. Each route lives in `apps/api/src/routes/`, and the app sets a `basePath('/api')` and one JSON `notFound` and `onError` handler, both `no-store`.
- **Zod** schemas for every route's input, attached with `@hono/zod-validator`. Invalid input returns a 400 with a specific message and `Cache-Control: no-store`, before any upstream call. Handlers read `c.req.valid('query')`, which is typed from the schema.
- The app exports `AppType`, so the frontend can use Hono's RPC client (`hc<AppType>`) in step 3.

## Alternatives considered

- **A bare `fetch` handler with hand-written routing.** No dependencies, but routing, error handling and validation would all be reinvented, and none of it typed.
- **itty-router.** Smaller, but less built-in typing, and no equivalent of Hono's RPC client.
- **Validation by hand or with Valibot.** Valibot is lighter, and `zod/mini` is an option if bundle size starts to matter. Zod is the most widely known, and Drizzle (step 2) can generate Zod schemas from tables.

## Consequences

- Input rules, error messages and types sit in one place per route. The tests check that 7 kinds of bad input are rejected without calling ESPN.
- Hono uses web-standard `Request`/`Response`, so routes would run unchanged on Node, Bun or Vercel.
- The Worker bundle is about 846 KiB (140 KiB gzipped), mostly Zod. Startup is about 30 ms. If size becomes a problem, switching to `zod/mini` is the first step.
