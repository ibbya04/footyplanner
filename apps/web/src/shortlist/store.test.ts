import type { Fixture } from '@footyplanner/shared';
import { describe, expect, it } from 'vitest';
import { readShortlist, refreshSaved, toggleSaved, writeShortlist } from './store';

function memoryStorage(initial: Record<string, string> = {}) {
    const items = new Map(Object.entries(initial));
    return {
        getItem: (key: string) => items.get(key) ?? null,
        setItem: (key: string, value: string) => void items.set(key, value),
        items,
    };
}

function fixture(id: string, kickoff: string, overrides: Partial<Fixture> = {}): Fixture {
    return {
        id,
        comp: 'eng.1',
        kickoff,
        timeConfirmed: true,
        status: { state: 'pre', name: 'STATUS_SCHEDULED', detail: null },
        home: { id: '364', name: 'Liverpool', shortName: 'Liverpool', abbreviation: 'LIV', crest: null },
        away: { id: '359', name: 'Arsenal', shortName: 'Arsenal', abbreviation: 'ARS', crest: null },
        score: null,
        venue: {
            name: 'Anfield',
            city: 'Liverpool',
            country: 'England',
            lat: 53.4308,
            lng: -2.9608,
            precision: 'stadium',
        },
        neutral: false,
        url: null,
        ...overrides,
    };
}

describe('shortlist store', () => {
    it('is empty when nothing has been saved', () => {
        expect(readShortlist(memoryStorage())).toEqual([]);
    });

    it('reads back the fixtures it saved', () => {
        const storage = memoryStorage();
        const saved = [fixture('eng.1:a', '2026-11-21T15:00:00.000Z'), fixture('eng.1:b', '2026-11-22T16:30:00.000Z')];

        writeShortlist(storage, saved);

        expect(readShortlist(storage)).toEqual(saved);
    });

    it('starts empty when what was stored is not valid JSON', () => {
        expect(readShortlist(memoryStorage({ 'fp:shortlist': '{not json' }))).toEqual([]);
    });

    it('drops stored entries that are not fixtures, keeping the rest', () => {
        const good = fixture('eng.1:a', '2026-11-21T15:00:00.000Z');
        const storage = memoryStorage({
            'fp:shortlist': JSON.stringify([good, { id: 'eng.1:b' }, 'nonsense', null]),
        });

        expect(readShortlist(storage)).toEqual([good]);
    });

    it('starts empty when what was stored is not a list', () => {
        expect(readShortlist(memoryStorage({ 'fp:shortlist': '{"id":"eng.1:a"}' }))).toEqual([]);
    });

    it('carries on when the browser blocks storage', () => {
        const blocked = {
            getItem: () => {
                throw new Error('SecurityError');
            },
            setItem: () => {
                throw new Error('QuotaExceededError');
            },
        };

        expect(readShortlist(blocked)).toEqual([]);
        expect(() => writeShortlist(blocked, [fixture('eng.1:a', '2026-11-21T15:00:00.000Z')])).not.toThrow();
    });

    it('starring a fixture adds it, and starring it again removes it', () => {
        const saturday = fixture('eng.1:a', '2026-11-21T15:00:00.000Z');
        const sunday = fixture('eng.1:b', '2026-11-22T16:30:00.000Z');

        const both = toggleSaved(toggleSaved([], saturday), sunday);
        expect(both.map(f => f.id)).toEqual(['eng.1:a', 'eng.1:b']);

        expect(toggleSaved(both, saturday).map(f => f.id)).toEqual(['eng.1:b']);
    });

    it('refreshing replaces saved copies with fresh data and keeps fixtures not in it', () => {
        const saturday = fixture('eng.1:a', '2026-11-21T15:00:00.000Z');
        const later = fixture('eng.1:b', '2026-12-26T15:00:00.000Z');
        const moved = { ...saturday, kickoff: '2026-11-21T17:30:00.000Z' };

        const refreshed = refreshSaved([saturday, later], [moved, fixture('eng.1:c', '2026-11-21T20:00:00.000Z')]);

        expect(refreshed).toEqual([moved, later]);
    });

    it('refreshing gives back the same list when nothing changed, so nothing is rewritten', () => {
        const saved = [fixture('eng.1:a', '2026-11-21T15:00:00.000Z')];

        expect(refreshSaved(saved, [fixture('eng.1:a', '2026-11-21T15:00:00.000Z')])).toBe(saved);
    });
});
