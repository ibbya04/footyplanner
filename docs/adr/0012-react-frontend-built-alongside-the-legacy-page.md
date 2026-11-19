# 0012. React frontend, built alongside the legacy page

- Status: Accepted
- Date: 2026-11-19

## Context

The legacy page is one 2,573-line `index.html` with 116 functions and global state, and no types or tests. Step 3 replaces it with Vite, React and TypeScript (decisions 4, 13, 14 and 15 in `docs/PLAN.md`). That's too much for one pull request, and the site has to keep working after every merge, so the new app needs somewhere to live while it's incomplete.

The API is a Hono app with typed routes. The frontend should get those types without copying them, but the API's source depends on Cloudflare's globals (`Env`, `D1Database`, `ExportedHandler`), which don't exist in a browser TypeScript project and clash with the DOM types.

## Decision

- **The React app is served at `/next/`** until step 3e moves it to `/`. Vite builds with `base: '/next/'` into `apps/web/dist/next/`, and the build copies `apps/web/legacy/` into `apps/web/dist/`, which the Worker serves as its static assets. Step 3 is split into five pull requests (3a–3e, see `docs/PLAN.md`), each deployable.
- **Typed API calls with the Hono RPC client.** `apps/api/tsconfig.rpc.json` emits declaration files for the API to `apps/api/dist/rpc/`, and `@footyplanner/api` exports only those types. The web app imports `AppType` from them and calls `hc<AppType>()`. The Worker-only names in the declarations are skipped by `skipLibCheck`. The web app's typecheck builds the declarations first.
- **TanStack Query** for API data, with `parseResponse` turning error responses into thrown errors. Fixtures refetch every 2 minutes to match the cron's live refresh.
- **react-leaflet with react-leaflet-cluster** for the map, keeping Leaflet, the Esri tiles and the clustering settings from the legacy page. Pins are Leaflet `divIcon`s built as DOM elements rather than HTML strings, so team and competition names never need escaping.
- **CSS Modules** per component, with the legacy colour variables in `src/styles/global.css`.
- **Playwright** for end-to-end tests. Its web server applies the migrations to a separate local D1 (`.wrangler/e2e`), loads `e2e/seed.sql` (fixtures dated relative to today) and runs `wrangler dev`, so the tests run against the real Worker, built pages and database, offline from ESPN.

## Alternatives considered

- **Rewrite in one pull request.** One very large diff, and the site would be half-built or unchanged until the end.
- **Serve the new app from preview versions only.** Nothing lands on the live site until the end, and the cutover is a big bang.
- **Import the API source directly for `AppType`.** Pulls the Worker's globals into the browser project. Including `worker-configuration.d.ts` there clashes with the DOM's `Request`, `Response` and `fetch` types.
- **Hand-written fetch functions using the shared response types.** No build step for types, but route paths and query parameters aren't checked, which is the point of the RPC client.
- **MapLibre GL.** Better for large datasets and vector tiles, but a bigger change than needed now. It stays under "Later" in the plan.

## Consequences

- The JavaScript bundle is about 450 KB (136 KB gzipped), mostly React, Leaflet and the clustering plugin. It's only loaded at `/next/` until the cutover.
- CI builds the frontend in every job that deploys, and a separate `e2e` job runs Playwright with Chromium. Preview and production deploys wait for it.
- Changing an API route's response shows up as a type error in the web app, as long as typecheck runs `build:rpc` first (the web app's `typecheck` script does).
- `/next/` has no client-side routing yet. Unknown paths under it return the Worker's 404.
