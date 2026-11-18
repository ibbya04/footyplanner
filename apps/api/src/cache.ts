// Cache headers for API responses. Browsers always revalidate; Cloudflare's edge (Workers Cache)
// keeps the response for `seconds`, so one visitor's request warms the cache for everyone.
// Cloudflare-CDN-Cache-Control is read and stripped by the edge. Stale-while-revalidate needs
// max-age rather than s-maxage there.

export function cacheFor(seconds: number, staleSeconds = seconds * 10): Record<string, string> {
    return {
        'Cache-Control': 'public, max-age=0',
        'Cloudflare-CDN-Cache-Control': `max-age=${seconds}, stale-while-revalidate=${staleSeconds}`,
    };
}

// Errors and validation failures must never be cached (Workers Cache caches responses without headers).
export const NO_STORE = { 'Cache-Control': 'no-store' };
