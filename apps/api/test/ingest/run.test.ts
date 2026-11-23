import { env } from 'cloudflare:test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getDb } from '../../src/db';
import { claim } from '../../src/ingest/queue';
import { runIngest } from '../../src/ingest/run';
import { ENG1_NOVEMBER, fakeUpstream, type FakeUpstream } from './fake-upstream';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const T = (iso: string) => Date.parse(iso);
const NOW = T('2026-11-18T12:01:00Z');

const all = <T>(sql: string, ...params: unknown[]) =>
    env.DB.prepare(sql)
        .bind(...params)
        .all<T>()
        .then(r => r.results);
const one = async <T>(sql: string, ...params: unknown[]) => (await all<T>(sql, ...params))[0];
const dueAgain = (month: string) =>
    env.DB.prepare('UPDATE ingest_queue SET next_run_at = CASE WHEN month = ? THEN 0 ELSE 9e15 END').bind(month).run();

let fake: FakeUpstream;

beforeEach(async () => {
    fake = fakeUpstream();
    await env.DB.prepare(`UPDATE competitions SET active = 0 WHERE slug != 'eng.1'`).run();
});
afterEach(() => {
    vi.restoreAllMocks();
});

describe('seed data', () => {
    it('has the competitions, venues and overrides from the old page', async () => {
        await env.DB.prepare('UPDATE competitions SET active = 1').run();
        expect(await one('SELECT count(*) n FROM competitions WHERE active = 1')).toEqual({ n: 26 });
        expect(await one(`SELECT count(*) n FROM venues WHERE source = 'seed'`)).toEqual({ n: 259 });
        expect(await one(`SELECT tbc_weeks, featured FROM competitions WHERE slug = 'eng.1'`)).toEqual({
            tbc_weeks: 5,
            featured: 1,
        });
        expect(await all(`SELECT key FROM venue_overrides ORDER BY key`)).toEqual([
            { key: 'estadio de la cerámica|villarreal|spain' },
            { key: 'stade louis ii|monaco|france' },
        ]);
        expect(
            await one(
                `SELECT lat, lng, precision FROM venue_overrides WHERE key = 'estadio de la cerámica|villarreal|spain'`,
            ),
        ).toEqual({
            lat: 39.94417,
            lng: -0.10361,
            precision: 'stadium',
        });
    });
});

describe('sweep', () => {
    it('fills the queue on the first run and fetches the nearest months first', async () => {
        const summary = await runIngest(env, NOW);
        expect(summary).toMatchObject({ mode: 'sweep', espnCalls: 2, fixturesWritten: 4, errors: [] });
        const fetched = fake.calls.filter(c => c.startsWith('espn')).sort();
        expect(fetched).toContain('espn eng.1 202611');
        expect(fetched.filter(c => /^espn eng\.1 2026(10|12)$/.test(c))).toHaveLength(1);

        expect(await one('SELECT count(*) n FROM ingest_queue')).toEqual({ n: 13 });
        expect(await one(`SELECT last_ok_at, next_run_at, failures FROM ingest_queue WHERE month = '2026-11'`)).toEqual(
            {
                last_ok_at: NOW,
                next_run_at: NOW + 3 * HOUR,
                failures: 0,
            },
        );
        expect(await one('SELECT count(*) n FROM teams')).toEqual({ n: 8 });
        expect(await one(`SELECT mode, espn_calls, fixtures_written, errors FROM ingest_runs`)).toEqual({
            mode: 'sweep',
            espn_calls: 2,
            fixtures_written: 4,
            errors: null,
        });
    });

    it('writes nothing when ESPN sends the same data again', async () => {
        await runIngest(env, NOW);
        await dueAgain('2026-11');
        const before = await all('SELECT id, updated_at FROM fixtures ORDER BY id');
        const summary = await runIngest(env, NOW + 2 * MINUTE + MINUTE);
        expect(summary.fixturesWritten).toBe(0);
        expect(await all('SELECT id, updated_at FROM fixtures ORDER BY id')).toEqual(before);
        expect(await one('SELECT count(*) n FROM fixture_changes')).toEqual({ n: 0 });
    });

    it('records a moved kick-off and marks fixtures ESPN stopped listing as removed', async () => {
        await runIngest(env, NOW);
        const board = structuredClone(ENG1_NOVEMBER);
        const moved = board.events![2]!;
        moved.competitions![0]!.date = '2026-11-22T16:30Z';
        const dropped = board.events!.pop()!;
        fake.espn.set('eng.1 202611', board);
        await dueAgain('2026-11');

        await runIngest(env, NOW + 3 * MINUTE);
        expect(await one('SELECT kind, before, after FROM fixture_changes')).toEqual({
            kind: 'kickoff',
            before: '2026-11-21T12:30:00.000Z',
            after: '2026-11-22T16:30:00.000Z',
        });
        expect(await one('SELECT removed_at FROM fixtures WHERE id = ?', `eng.1:${dropped.id}`)).toEqual({
            removed_at: NOW + 3 * MINUTE,
        });
    });

    it('backs off when ESPN fails', async () => {
        fake.espn.set('eng.1 202611', 503);
        const summary = await runIngest(env, NOW);
        expect(summary.errors).toContain('eng.1 2026-11: HTTP 503');
        expect(await one(`SELECT failures, last_error, next_run_at FROM ingest_queue WHERE month = '2026-11'`)).toEqual(
            {
                failures: 1,
                last_error: 'HTTP 503',
                next_run_at: NOW + 15 * MINUTE,
            },
        );
        expect(await one('SELECT errors FROM ingest_runs')).toEqual({ errors: JSON.stringify(summary.errors) });
    });

    it('never hands the same queue row to two runs', async () => {
        await runIngest(env, NOW);
        await env.DB.prepare('UPDATE ingest_queue SET next_run_at = 0').run();
        const db = getDb(env.DB);
        const [a, b] = await Promise.all([claim(db, NOW, 5), claim(db, NOW, 5)]);
        const keys = [...a!, ...b!].map(i => `${i.comp} ${i.month}`);
        expect(new Set(keys).size).toBe(keys.length);
        expect(keys).toHaveLength(10);
    });
});

describe('live', () => {
    it('refreshes today for competitions with a match on, on even minutes', async () => {
        await runIngest(env, NOW);
        const live = structuredClone(ENG1_NOVEMBER);
        live.events = live.events!.filter(e => e.competitions![0]!.date === '2026-11-21T15:00Z');
        const c = live.events[0]!.competitions![0]!;
        live.events[0]!.status = { type: { state: 'in', name: 'STATUS_SECOND_HALF', shortDetail: "67'" } };
        c.competitors![0]!.score = '2';
        c.competitors![1]!.score = '1';
        fake.espn.set('eng.1 20261121', live);

        const summary = await runIngest(env, T('2026-11-21T16:08:00Z'));
        expect(summary.mode).toBe('live');
        expect(fake.calls).toContain('espn eng.1 20261121');
        expect(
            await one(
                `SELECT state, status_detail, home_score, away_score FROM fixtures WHERE kickoff = ?`,
                '2026-11-21T15:00:00.000Z',
            ),
        ).toEqual({
            state: 'in',
            status_detail: "67'",
            home_score: 2,
            away_score: 1,
        });
    });

    it('sweeps instead when nothing is on', async () => {
        await runIngest(env, NOW);
        const summary = await runIngest(env, T('2026-11-18T12:02:00Z'));
        expect(summary.mode).toBe('sweep');
    });
});

describe('venues and images', () => {
    it('locates a venue the seed data does not have, one per run', async () => {
        const board = structuredClone(ENG1_NOVEMBER);
        board.events![0]!.competitions![0]!.venue = {
            id: '9',
            fullName: 'New Ground',
            address: { city: 'Leeds', country: 'England' },
        };
        fake.espn.set('eng.1 202611', board);
        fake.photon = (q, tag) => (tag === 'place' ? [{ lat: 53.8, lng: -1.55 }] : [{ lat: 53.78, lng: -1.57 }]);

        await runIngest(env, NOW);
        expect(fake.calls).toContain('photon Leeds, England');
        expect(
            await one(
                `SELECT name, lat, lng, precision, source, next_geocode_at FROM venues WHERE key = 'new ground|leeds|england'`,
            ),
        ).toEqual({
            name: 'New Ground',
            lat: 53.78,
            lng: -1.57,
            precision: 'stadium',
            source: 'photon',
            next_geocode_at: null,
        });
    });

    it('does not geocode venues that have an override', async () => {
        await env.DB.prepare(
            `INSERT INTO venues (key, name, next_geocode_at, geocode_attempts) VALUES ('stade louis ii|monaco|france', 'Stade Louis II', 0, 0)
             ON CONFLICT (key) DO UPDATE SET lat = NULL, next_geocode_at = 0`,
        ).run();
        await runIngest(env, NOW);
        expect(fake.calls.filter(c => c.startsWith('photon'))).toEqual([]);
    });

    it('copies crests into R2, three per run', async () => {
        await runIngest(env, NOW);
        const copied = await all<{ id: string; crest_key: string }>(
            'SELECT id, crest_key FROM teams WHERE crest_key IS NOT NULL',
        );
        expect(copied).toHaveLength(3);
        const object = await env.IMAGES.get(copied[0]!.crest_key);
        expect(object?.httpMetadata?.contentType).toBe('image/png');
        expect(copied[0]!.crest_key).toBe(`teams/${copied[0]!.id}.png`);
    });
});
