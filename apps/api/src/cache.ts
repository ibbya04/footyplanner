export function cacheFor(seconds: number, staleSeconds = seconds * 10): Record<string, string> {
    return {
        'Cache-Control': 'public, max-age=0',
        'Cloudflare-CDN-Cache-Control': `max-age=${seconds}, stale-while-revalidate=${staleSeconds}`,
    };
}

export const NO_STORE = { 'Cache-Control': 'no-store' };
