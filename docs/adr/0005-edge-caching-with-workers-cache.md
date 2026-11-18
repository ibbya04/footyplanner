# 0005. Edge caching with Workers Cache

- Status: Accepted
- Date: 2026-11-18

## Context

On Vercel, `/api/day` and `/api/venue` set `Cache-Control: s-maxage=…, stale-while-revalidate=…`. Vercel's CDN then shared one visitor's response with everyone, which kept ESPN and Photon calls low. Cache lifetimes depend on the data: about 2 minutes around today (live scores), 3 hours for future days, a week for finished days, and 30 days for stadium locations.

Cloudflare has two caching features for Workers (checked against the docs on 2026-11-18):

- The **Cache API** (`caches.default`) only stores entries in the data centre that wrote them, and is documented as working on custom domains, not `workers.dev`.
- **Workers Cache** (`"cache": { "enabled": true }`) caches the Worker's own responses at the edge and answers repeat requests without running the Worker. It's tiered, its cache key includes the query string, and it works on `workers.dev`. It reads `Cloudflare-CDN-Cache-Control` before `Cache-Control`. Its stale-while-revalidate only works with `max-age`; `s-maxage` turns it off. Responses without a `Cache-Control` header are still cached (2 hours for a 200).

## Decision

Enable Workers Cache and set the headers through `cacheFor()` in `apps/api/src/cache.ts`:

```
Cache-Control: public, max-age=0                                   # browsers always revalidate
Cloudflare-CDN-Cache-Control: max-age=<s>, stale-while-revalidate=<s×10>   # edge only, removed before the browser
```

Every error, 400 and 404 is sent with `Cache-Control: no-store`. The lifetimes are the same as on Vercel.

## Alternatives considered

- **Cache API inside the Worker.** More control (custom keys, manual purges), but only per data centre, not on `workers.dev`, and the Worker still runs on every request.
- **KV as a cache.** Global, but only 1,000 writes a day on the Free plan, and updates take up to 60 s to reach every location.
- **Keep `s-maxage`.** Honoured, but it disables stale-while-revalidate on Workers Cache.

## Consequences

- Checked on the deployed Worker: the first request is a `MISS`, repeats are a `HIT` with a rising `Age`, and a bad request is a `BYPASS`.
- Cache hits don't count as Worker requests or CPU, which protects the Free plan's 100k requests a day.
- The cache key includes the Worker version, so every deploy starts with an empty cache.
- Vitest doesn't run Workers Cache, so caching can only be checked on a deployed version or preview. The tests check the headers instead.
- Forgetting `no-store` on a new error path means it gets cached for 2 hours. The 404 and error handlers set it centrally, and the tests check it.
