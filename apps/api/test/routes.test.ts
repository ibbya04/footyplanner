import type { CompetitionsResponse, FixturesResponse, StatusResponse } from '@footyplanner/shared';
import { env } from 'cloudflare:test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { app } from '../src';
import { runIngest } from '../src/ingest/run';
import { api } from './helpers';
import { fakeUpstream, PNG } from './ingest/fake-upstream';

const NOW = Date.parse('2026-11-18T12:01:00Z');

beforeEach(async () => {
    fakeUpstream();
    await env.DB.prepare(`UPDATE competitions SET active = 0 WHERE slug != 'eng.1'`).run();
    await runIngest(env, NOW);
});
afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
});

describe('GET /api/fixtures', () => {
    it('returns fixtures in the range with teams, scores and venue coordinates', async () => {
        const res = await api('/api/fixtures?from=2026-11-01&to=2026-11-30&comps=eng.1,esp.1');
        expect(res.status).toBe(200);
        const body = await res.json<FixturesResponse>();
        expect(body.fixtures).toHaveLength(4);
        const [first, , third] = body.fixtures;
        expect(first).toMatchObject({
            comp: 'eng.1',
            kickoff: '2026-11-01T16:30:00.000Z',
            timeConfirmed: true,
            status: { state: 'post', name: 'STATUS_FULL_TIME' },
            home: { name: 'Liverpool' },
            away: { name: 'Arsenal' },
            score: { home: 0, away: 1 },
            venue: { name: 'Anfield', city: 'Liverpool', precision: 'stadium' },
        });
        expect(first!.venue!.lat).toBeCloseTo(53.43, 1);
        expect(third!.score).toBeNull();
        const crests = body.fixtures.flatMap(f => [f.home!.crest, f.away!.crest]);
        expect(crests.filter(c => c?.startsWith('/img/teams/'))).toHaveLength(3);
        expect(crests.filter(c => c?.startsWith('https://a.espncdn.com/'))).toHaveLength(5);
    });

    it('treats from and to as whole UTC days', async () => {
        const body = await (
            await api('/api/fixtures?from=2026-11-21&to=2026-11-21&comps=eng.1')
        ).json<FixturesResponse>();
        expect(body.fixtures.map(f => f.kickoff)).toEqual(['2026-11-21T12:30:00.000Z', '2026-11-21T15:00:00.000Z']);
    });

    it('prefers a venue override over the stored location', async () => {
        await env.DB.prepare(
            `INSERT INTO venue_overrides (key, lat, lng, precision) VALUES ('anfield|liverpool|england', 1, 2, 'city')`,
        ).run();
        const body = await (
            await api('/api/fixtures?from=2026-11-01&to=2026-11-01&comps=eng.1')
        ).json<FixturesResponse>();
        expect(body.fixtures[0]!.venue).toMatchObject({ lat: 1, lng: 2, precision: 'city' });
    });

    it('leaves out fixtures ESPN no longer lists', async () => {
        await env.DB.prepare(`UPDATE fixtures SET removed_at = 1 WHERE kickoff LIKE '2026-11-01%'`).run();
        const body = await (
            await api('/api/fixtures?from=2026-11-01&to=2026-11-01&comps=eng.1')
        ).json<FixturesResponse>();
        expect(body.fixtures).toEqual([]);
    });

    it.each([
        ['2026-11-10', '2026-11-20', 'max-age=60, stale-while-revalidate=300'],
        ['2026-10-01', '2026-10-31', 'max-age=86400'],
        ['2026-12-01', '2026-12-31', 'max-age=3600'],
    ])('caches %s to %s with %s', async (from, to, expected) => {
        vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
        const res = await api(`/api/fixtures?from=${from}&to=${to}&comps=eng.1`);
        expect(res.headers.get('Cloudflare-CDN-Cache-Control')).toContain(expected);
    });

    it.each([
        ['from=2026-11-01&comps=eng.1', 'to must be YYYY-MM-DD'],
        ['from=2026-11-10&to=2026-11-01&comps=eng.1', 'to must not be before from'],
        ['from=2026-11-01&to=2027-01-02&comps=eng.1', 'the range can be at most 62 days'],
        ['from=2026-11-01&to=2026-11-02&comps=../x', 'comps must be 1-40 ESPN league slugs'],
    ])('rejects %s', async (qs, error) => {
        const res = await api(`/api/fixtures?${qs}`);
        expect(res.status).toBe(400);
        expect(await res.json()).toEqual({ error });
        expect(res.headers.get('Cache-Control')).toBe('no-store');
    });

    it('returns every active competition when comps is left out', async () => {
        await env.DB.prepare(
            `INSERT INTO fixtures (id, comp, kickoff, time_valid, state, status_name, updated_at)
             VALUES ('esp.1:inactive', 'esp.1', '2026-11-21T20:00:00.000Z', 1, 'pre', 'STATUS_SCHEDULED', 0)`,
        ).run();

        const res = await api('/api/fixtures?from=2026-11-01&to=2026-11-30');

        expect(res.status).toBe(200);
        const { fixtures } = await res.json<FixturesResponse>();
        expect(fixtures).toHaveLength(4);
        expect(new Set(fixtures.map(f => f.comp))).toEqual(new Set(['eng.1']));
    });

    it('accepts the longest allowed range', async () => {
        expect((await api('/api/fixtures?from=2026-11-01&to=2027-01-01&comps=eng.1')).status).toBe(200);
    });
});

describe('GET /api/competitions', () => {
    it('lists active competitions in order with TBC guidance and logos', async () => {
        await env.DB.prepare('UPDATE competitions SET active = 1').run();
        const { competitions } = await (await api('/api/competitions')).json<CompetitionsResponse>();
        expect(competitions).toHaveLength(26);
        expect(competitions[0]!.slug).toBe('uefa.champions');
        expect(competitions.find(c => c.slug === 'eng.1')).toMatchObject({
            name: 'Premier League',
            featured: true,
            group: { key: 'eng', name: 'England', color: '#a855f7' },
            tbc: { weeks: 5, tv: true },
            logo: expect.stringContaining('espncdn.com'),
        });
    });
});

describe('GET /api/status', () => {
    it('reports the last run and per-competition freshness', async () => {
        const body = await (await api('/api/status')).json<StatusResponse>();
        expect(body.lastRun).toMatchObject({ mode: 'sweep', espnCalls: 2, fixturesWritten: 4, errors: [] });
        expect(body.competitions).toEqual([
            {
                slug: 'eng.1',
                months: 13,
                monthsFetched: 2,
                lastOkAt: new Date(NOW).toISOString(),
                failingMonths: 0,
                lastError: null,
            },
        ]);
        expect(body.pending).toEqual({ venues: 0, crests: 5 });
    });
});

describe('GET /img/*', () => {
    it('serves copied crests from R2 with a long cache', async () => {
        const key = (await env.DB.prepare('SELECT crest_key FROM teams WHERE crest_key IS NOT NULL').first<string>(
            'crest_key',
        ))!;
        const res = await api(`/img/${key}`);
        expect(res.status).toBe(200);
        expect(res.headers.get('Content-Type')).toBe('image/png');
        expect(res.headers.get('Cloudflare-CDN-Cache-Control')).toContain('max-age=2592000');
        expect(new Uint8Array(await res.arrayBuffer())).toEqual(PNG);
    });

    it('returns an uncached 404 for anything else', async () => {
        for (const path of ['/img/teams/nope.png', '/img/../secrets', '/img/other/x.png']) {
            const res = await api(path);
            expect(res.status).toBe(404);
            expect(res.headers.get('Cache-Control')).toBe('no-store');
        }
    });
});

describe('rate limiting', () => {
    it('answers 429 when the limiter says no', async () => {
        const limiter = { limit: vi.fn(async () => ({ success: false })) };
        const res = await app.request(
            '/api/competitions',
            { headers: { 'CF-Connecting-IP': '203.0.113.7' } },
            { ...env, API_LIMITER: limiter },
        );
        expect(res.status).toBe(429);
        expect(res.headers.get('Cache-Control')).toBe('no-store');
        expect(limiter.limit).toHaveBeenCalledWith({ key: '203.0.113.7' });
    });
});
