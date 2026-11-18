import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, json, mockUpstream } from './helpers';

const scoreboard = (id: string) => ({
    leagues: [{ logos: [{ href: 'logo.png', rel: ['full', 'default'] }] }],
    events: [{ id, date: '2026-11-22T15:00Z', season: { year: 2026 }, competitions: [{ competitors: [] }] }],
});

const isoDay = (offset: number) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);

afterEach(() => {
    vi.restoreAllMocks();
});

describe('GET /api/day', () => {
    it('returns every competition for the day, trimmed', async () => {
        const fetch = mockUpstream(url => json(scoreboard(url.pathname.split('/').at(-2)!)));
        const res = await api('/api/day?date=2026-11-22&comps=esp.1,eng.1,eng.1');
        expect(res.status).toBe(200);
        const body = await res.json<{ competitions: Record<string, { logo: string; events: object[] }> }>();
        expect(Object.keys(body.competitions).sort()).toEqual(['eng.1', 'esp.1']);
        expect(body.competitions['eng.1']!.logo).toBe('logo.png');
        expect(body.competitions['eng.1']!.events[0]).not.toHaveProperty('season');
        expect(fetch).toHaveBeenCalledTimes(2);
        expect(String(fetch.mock.calls[0]![0])).toContain('/scoreboard?dates=20261122');
    });

    it('reports competitions that failed and caches briefly', async () => {
        mockUpstream(url => (url.pathname.includes('esp.1') ? json({}, 503) : json(scoreboard('1'))));
        const res = await api('/api/day?date=2026-11-22&comps=eng.1,esp.1');
        expect(res.status).toBe(200);
        expect(await res.json()).toMatchObject({ failed: ['esp.1'] });
        expect(res.headers.get('Cloudflare-CDN-Cache-Control')).toBe('max-age=60, stale-while-revalidate=600');
    });

    it('returns 502, uncached, when ESPN is down for everything', async () => {
        mockUpstream(() => json({}, 500));
        const res = await api('/api/day?date=2026-11-22&comps=eng.1');
        expect(res.status).toBe(502);
        expect(res.headers.get('Cache-Control')).toBe('no-store');
    });

    it.each([
        [isoDay(-10), 'max-age=604800'],
        [isoDay(0), 'max-age=120, stale-while-revalidate=600'],
        [isoDay(10), 'max-age=10800'],
    ])('caches %s at the edge with %s', async (date, expected) => {
        mockUpstream(() => json(scoreboard('1')));
        const res = await api(`/api/day?date=${date}&comps=eng.1`);
        expect(res.headers.get('Cloudflare-CDN-Cache-Control')).toContain(expected);
        expect(res.headers.get('Cache-Control')).toBe('public, max-age=0');
    });

    it.each([
        ['/api/day?comps=eng.1', 'date must be YYYY-MM-DD'],
        ['/api/day?date=22-11-2026&comps=eng.1', 'date must be YYYY-MM-DD'],
        ['/api/day?date=2026-13-45&comps=eng.1', 'date must be YYYY-MM-DD'],
        ['/api/day?date=2026-11-22', 'comps must be 1-40 ESPN league slugs'],
        ['/api/day?date=2026-11-22&comps=', 'comps must be 1-40 ESPN league slugs'],
        ['/api/day?date=2026-11-22&comps=../../etc', 'comps must be 1-40 ESPN league slugs'],
        [
            `/api/day?date=2026-11-22&comps=${Array.from({ length: 41 }, (_, i) => `l.${i}`).join(',')}`,
            'comps must be 1-40 ESPN league slugs',
        ],
    ])('rejects %s', async (path, error) => {
        const fetch = mockUpstream(() => json({}));
        const res = await api(path);
        expect(res.status).toBe(400);
        expect(await res.json()).toEqual({ error });
        expect(res.headers.get('Cache-Control')).toBe('no-store');
        expect(fetch).not.toHaveBeenCalled();
    });
});

describe('unknown routes', () => {
    it('return a JSON 404 so the page falls back to calling ESPN directly', async () => {
        const res = await api('/api/nope');
        expect(res.status).toBe(404);
        expect(res.headers.get('Content-Type')).toContain('application/json');
    });
});
