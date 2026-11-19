import type { TripCreated, TripResponse } from '@footyplanner/shared';
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

function send(method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
    return app.request(
        path,
        {
            method,
            headers: { 'Content-Type': 'application/json', ...headers },
            ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        },
        env,
    );
}

async function createTrip(body: unknown = { name: 'Northern weekend', fixtureIds: fixtureIds.slice(0, 2) }) {
    const res = await send('POST', '/api/trips', body);
    expect(res.status).toBe(201);
    return res.json<TripCreated>();
}

describe('POST /api/trips', () => {
    it('saves the trip and returns its public id and a secret edit token', async () => {
        const created = await createTrip();
        expect(created.id).toMatch(/^[A-Za-z0-9_-]{10}$/);
        expect(created.editToken).toMatch(/^[A-Za-z0-9_-]{43}$/);

        const row = await env.DB.prepare(`SELECT * FROM trips WHERE id = ?`)
            .bind(created.id)
            .first<{ name: string; fixture_ids: string; edit_token_hash: string }>();
        expect(row).toMatchObject({ name: 'Northern weekend' });
        expect(JSON.parse(row!.fixture_ids)).toEqual(fixtureIds.slice(0, 2));
        expect(row!.edit_token_hash).toMatch(/^[0-9a-f]{64}$/);
        expect(JSON.stringify(row)).not.toContain(created.editToken);
    });

    it('gives every trip its own id and token', async () => {
        const [a, b] = [await createTrip(), await createTrip()];
        expect(a.id).not.toBe(b.id);
        expect(a.editToken).not.toBe(b.editToken);
    });

    it('rejects trips that are empty, too long, repeat a fixture or name fixtures that do not exist', async () => {
        const tooMany = Array.from({ length: 51 }, (_, i) => `eng.1:${i}`);
        for (const body of [
            { fixtureIds: [] },
            { fixtureIds: tooMany },
            { fixtureIds: [fixtureIds[0], fixtureIds[0]] },
            { fixtureIds: [fixtureIds[0], 'eng.1:999999'] },
            { fixtureIds: [fixtureIds[0]], name: 'x'.repeat(61) },
            { fixtureIds: ['not an id'] },
        ]) {
            const res = await send('POST', '/api/trips', body);
            expect(res.status, JSON.stringify(body)).toBe(400);
            expect(res.headers.get('Cache-Control')).toBe('no-store');
        }
        const count = await env.DB.prepare(`SELECT count(*) AS n FROM trips`).first<{ n: number }>();
        expect(count!.n).toBe(0);
    });

    it('answers 429 when the trip limiter says no', async () => {
        const limiter = { limit: vi.fn(async () => ({ success: false })) };
        const res = await app.request(
            '/api/trips',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.7' },
                body: JSON.stringify({ fixtureIds: fixtureIds.slice(0, 1) }),
            },
            { ...env, TRIP_LIMITER: limiter },
        );
        expect(res.status).toBe(429);
        expect(limiter.limit).toHaveBeenCalledWith({ key: '203.0.113.7' });
    });
});

describe('GET /api/trips/:id', () => {
    it('returns the trip with its fixtures as they are now, in kick-off order', async () => {
        const [first, second] = fixtureIds;
        const { id } = await createTrip({ name: 'Northern weekend', fixtureIds: [second, first] });
        await env.DB.prepare(`UPDATE fixtures SET kickoff = '2026-11-01T19:45:00.000Z' WHERE id = ?`).bind(first).run();

        const res = await send('GET', `/api/trips/${id}`);
        expect(res.status).toBe(200);
        expect(res.headers.get('Cache-Control')).toBe('no-store');
        const trip = await res.json<TripResponse>();
        expect(trip).toMatchObject({ id, name: 'Northern weekend', missing: [] });
        expect(trip.fixtures.map(f => f.id)).toEqual([first, second]);
        expect(trip.fixtures[0]).toMatchObject({ kickoff: '2026-11-01T19:45:00.000Z', home: { name: 'Liverpool' } });
        expect(Date.parse(trip.updatedAt)).not.toBeNaN();
    });

    it('lists fixtures ESPN no longer has under missing', async () => {
        const [first, second] = fixtureIds;
        const { id } = await createTrip({ fixtureIds: [first, second] });
        await env.DB.prepare(`UPDATE fixtures SET removed_at = 1 WHERE id = ?`).bind(second).run();

        const trip = await (await send('GET', `/api/trips/${id}`)).json<TripResponse>();
        expect(trip.name).toBeNull();
        expect(trip.fixtures.map(f => f.id)).toEqual([first]);
        expect(trip.missing).toEqual([second]);
    });

    it('answers an uncached 404 for a trip that does not exist', async () => {
        for (const path of ['/api/trips/AAAAAAAAAA', '/api/trips/not-an-id!']) {
            const res = await send('GET', path);
            expect(res.status).toBe(404);
            expect(res.headers.get('Cache-Control')).toBe('no-store');
        }
    });
});

describe('PUT /api/trips/:id', () => {
    const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

    it('replaces the trip when the edit token matches', async () => {
        const { id, editToken } = await createTrip();
        const res = await send('PUT', `/api/trips/${id}`, { fixtureIds: [fixtureIds[3]] }, bearer(editToken));
        expect(res.status).toBe(200);
        expect(res.headers.get('Cache-Control')).toBe('no-store');
        const updated = await res.json<TripResponse>();
        expect(updated).toMatchObject({ id, name: null, missing: [] });
        expect(updated.fixtures.map(f => f.id)).toEqual([fixtureIds[3]]);

        const trip = await (await send('GET', `/api/trips/${id}`)).json<TripResponse>();
        expect(trip.fixtures.map(f => f.id)).toEqual([fixtureIds[3]]);
    });

    it('refuses edits without the right token and leaves the trip as it was', async () => {
        const { id } = await createTrip();
        const { editToken: otherToken } = await createTrip();
        for (const headers of [{}, bearer(otherToken), { Authorization: 'Basic abc' }, bearer('')]) {
            const res = await send('PUT', `/api/trips/${id}`, { fixtureIds: [fixtureIds[3]] }, headers);
            expect(res.status, JSON.stringify(headers)).toBe(401);
            expect(res.headers.get('Cache-Control')).toBe('no-store');
        }
        const trip = await (await send('GET', `/api/trips/${id}`)).json<TripResponse>();
        expect(trip.fixtures.map(f => f.id)).toEqual(fixtureIds.slice(0, 2));
    });

    it('checks the new fixtures the same way as a new trip', async () => {
        const { id, editToken } = await createTrip();
        const res = await send('PUT', `/api/trips/${id}`, { fixtureIds: ['eng.1:999999'] }, bearer(editToken));
        expect(res.status).toBe(400);
    });

    it('answers 404 for a trip that does not exist', async () => {
        const { editToken } = await createTrip();
        const res = await send('PUT', '/api/trips/AAAAAAAAAA', { fixtureIds: [fixtureIds[0]] }, bearer(editToken));
        expect(res.status).toBe(404);
    });

    it('is not held to the trip creation limit', async () => {
        const { id, editToken } = await createTrip();
        const limiter = { limit: vi.fn(async () => ({ success: false })) };
        const res = await app.request(
            `/api/trips/${id}`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'CF-Connecting-IP': '203.0.113.7',
                    ...bearer(editToken),
                },
                body: JSON.stringify({ fixtureIds: [fixtureIds[0]] }),
            },
            { ...env, TRIP_LIMITER: limiter },
        );
        expect(res.status).toBe(200);
        expect(limiter.limit).not.toHaveBeenCalled();
    });
});
