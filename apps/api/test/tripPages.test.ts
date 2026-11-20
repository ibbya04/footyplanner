import type { TripCreated } from '@footyplanner/shared';
import { env } from 'cloudflare:test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { app } from '../src';
import { runIngest } from '../src/ingest/run';
import { fakeUpstream } from './ingest/fake-upstream';

const NOW = Date.parse('2026-11-18T12:01:00Z');

let fixtureIds: string[];

beforeEach(async () => {
    fakeUpstream();
    await env.DB.prepare(`UPDATE competitions SET active = 0 WHERE slug != 'eng.1'`).run();
    await runIngest(env, NOW);
    const { results } = await env.DB.prepare(`SELECT id FROM fixtures ORDER BY kickoff, id`).all<{ id: string }>();
    fixtureIds = results.map(r => r.id);
});
afterEach(() => {
    vi.restoreAllMocks();
});

async function createTrip(body: unknown) {
    const res = await app.request(
        '/api/trips',
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
        env,
    );
    return res.json<TripCreated>();
}

describe('GET /t/:id', () => {
    const page = '<!doctype html><title>Footy Planner</title>';
    const assets = () => ({
        fetch: vi.fn<(request: Request | string | URL) => Promise<Response>>(
            async () => new Response(page, { headers: { 'Content-Type': 'text/html' } }),
        ),
    });

    it('serves the app for a trip that exists', async () => {
        const { id } = await createTrip({ fixtureIds: fixtureIds.slice(0, 1) });
        const ASSETS = assets();
        const res = await app.request(`https://footyplanner.test/t/${id}`, {}, { ...env, ASSETS });
        expect(res.status).toBe(200);
        expect(await res.text()).toBe(page);
        const [requested] = ASSETS.fetch.mock.calls[0]!;
        expect(new URL(String(requested instanceof Request ? requested.url : requested)).pathname).toBe('/');
    });

    it('answers 404 without the app for a trip that does not exist', async () => {
        const ASSETS = assets();
        for (const path of ['/t/AAAAAAAAAA', '/t/short', '/t/']) {
            const res = await app.request(`https://footyplanner.test${path}`, {}, { ...env, ASSETS });
            expect(res.status, path).toBe(404);
        }
        expect(ASSETS.fetch).not.toHaveBeenCalled();
    });
});

describe('GET /t/:id.ics', () => {
    it('is a calendar of the trip as it is now, cached for 15 minutes at the edge', async () => {
        const [first, second] = fixtureIds;
        const { id } = await createTrip({ name: 'Northern weekend', fixtureIds: [first, second] });
        await env.DB.prepare(`UPDATE fixtures SET kickoff = '2026-11-01T19:45:00.000Z' WHERE id = ?`).bind(first).run();

        const res = await app.request(`/t/${id}.ics`, {}, env);
        expect(res.status).toBe(200);
        expect(res.headers.get('Content-Type')).toBe('text/calendar; charset=utf-8');
        expect(res.headers.get('Cloudflare-CDN-Cache-Control')).toMatch(/^max-age=900\b/);
        const ics = await res.text();
        expect(ics).toContain('X-WR-CALNAME:Northern weekend');
        expect(ics).toContain('REFRESH-INTERVAL;VALUE=DURATION:PT1H');
        expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
        expect(ics).toContain(`UID:${first!.replace(':', '-')}@footyplanner`);
        expect(ics).toContain('DTSTART:20261101T194500Z');
        expect(ics).toContain('(Premier League)');
    });

    it('falls back to a generic calendar name and leaves out fixtures ESPN no longer has', async () => {
        const [first, second] = fixtureIds;
        const { id } = await createTrip({ fixtureIds: [first, second] });
        await env.DB.prepare(`UPDATE fixtures SET removed_at = 1 WHERE id = ?`).bind(second).run();

        const ics = await (await app.request(`/t/${id}.ics`, {}, env)).text();
        expect(ics).toContain('X-WR-CALNAME:footyplanner trip');
        expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    });

    it('answers an uncached 404 for a trip that does not exist', async () => {
        const res = await app.request('/t/AAAAAAAAAA.ics', {}, env);
        expect(res.status).toBe(404);
        expect(res.headers.get('Cache-Control')).toBe('no-store');
    });
});
