import { describe, expect, it } from 'vitest';
import { diffFixtures, type StoredFixture } from '../../src/ingest/diff';
import type { FixtureInput } from '../../src/ingest/parse';

const base: FixtureInput = {
    id: 'eng.1:1',
    comp: 'eng.1',
    kickoff: '2026-11-21T15:00:00.000Z',
    timeValid: false,
    state: 'pre',
    statusName: 'STATUS_SCHEDULED',
    statusDetail: 'Scheduled',
    homeTeamId: '359',
    awayTeamId: '363',
    homeScore: null,
    awayScore: null,
    venueKey: 'emirates stadium|london|england',
    neutralSite: false,
    summaryUrl: null,
};
const stored = (f: FixtureInput, removedAt: number | null = null) =>
    new Map<string, StoredFixture>([[f.id, { ...f, removedAt }]]);

describe('diffFixtures', () => {
    it('writes new fixtures without recording changes', () => {
        expect(diffFixtures(new Map(), [base])).toEqual({ writes: [base], changes: [] });
    });

    it('writes nothing when nothing changed', () => {
        expect(diffFixtures(stored(base), [{ ...base }])).toEqual({ writes: [], changes: [] });
    });

    it('records a moved kick-off and a confirmed time', () => {
        const next = { ...base, kickoff: '2026-11-22T16:30:00.000Z', timeValid: true };
        const { writes, changes } = diffFixtures(stored(base), [next]);
        expect(writes).toEqual([next]);
        expect(changes).toEqual([
            { fixtureId: 'eng.1:1', kind: 'kickoff', before: base.kickoff, after: next.kickoff },
            { fixtureId: 'eng.1:1', kind: 'confirmed', before: null, after: next.kickoff },
        ]);
    });

    it('writes live score updates without recording them as changes', () => {
        const next = {
            ...base,
            state: 'in',
            statusName: 'STATUS_FIRST_HALF',
            statusDetail: "23'",
            homeScore: 1,
            awayScore: 0,
        };
        expect(diffFixtures(stored(base), [next])).toEqual({ writes: [next], changes: [] });
    });

    it('records postponements', () => {
        const next = { ...base, statusName: 'STATUS_POSTPONED' };
        expect(diffFixtures(stored(base), [next]).changes).toEqual([
            { fixtureId: 'eng.1:1', kind: 'status', before: 'STATUS_SCHEDULED', after: 'STATUS_POSTPONED' },
        ]);
    });

    it('rewrites a fixture that was marked removed and is listed again', () => {
        expect(diffFixtures(stored(base, 123), [{ ...base }]).writes).toHaveLength(1);
    });
});
