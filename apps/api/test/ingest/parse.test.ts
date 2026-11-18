import { describe, expect, it } from 'vitest';
import { parseEvent } from '../../src/ingest/parse';
import { ENG1_NOVEMBER } from './fake-upstream';

const events = ENG1_NOVEMBER.events!;

describe('parseEvent (real ESPN response, trimmed)', () => {
    it('turns a finished match into a fixture row', () => {
        const parsed = parseEvent('eng.1', events[0]!)!;
        expect(parsed.fixture).toMatchObject({
            id: `eng.1:${events[0]!.id}`,
            comp: 'eng.1',
            kickoff: '2026-11-01T16:30:00.000Z',
            state: 'post',
            statusName: 'STATUS_FULL_TIME',
            homeScore: 0,
            awayScore: 1,
            venueKey: 'anfield|liverpool|england',
        });
        expect(parsed.fixture.summaryUrl).toContain('espn.com');
        expect(parsed.teams.map(t => t.name)).toEqual(['Liverpool', 'Arsenal']);
        expect(parsed.teams[0]!.crestUrl).toMatch(/^https:\/\/a\.espncdn\.com\//);
        expect(parsed.venue).toMatchObject({ name: 'Anfield', city: 'Liverpool', country: 'England' });
        expect(parsed.venue!.espnId).toBeTruthy();
    });

    it('gives scheduled matches no score, even though ESPN sends "0"', () => {
        const parsed = parseEvent('eng.1', events[2]!)!;
        expect(parsed.fixture.state).toBe('pre');
        expect(parsed.fixture.homeScore).toBeNull();
        expect(parsed.fixture.awayScore).toBeNull();
    });

    it('treats a missing timeValid as confirmed and false as TBC', () => {
        const ev = structuredClone(events[2]!);
        delete ev.competitions![0]!.timeValid;
        expect(parseEvent('eng.1', ev)!.fixture.timeValid).toBe(true);
        ev.competitions![0]!.timeValid = false;
        expect(parseEvent('eng.1', ev)!.fixture.timeValid).toBe(false);
    });

    it('skips events it cannot place', () => {
        expect(parseEvent('eng.1', { id: '1' })).toBeNull();
        expect(parseEvent('eng.1', { id: '1', competitions: [{ competitors: [], date: 'nonsense' }] })).toBeNull();
    });

    it('keeps a fixture whose teams are not known yet, without team rows', () => {
        const ev = structuredClone(events[2]!);
        for (const c of ev.competitions![0]!.competitors!) c.team = { displayName: 'Winner of match 12' };
        const parsed = parseEvent('eng.1', ev)!;
        expect(parsed.teams).toEqual([]);
        expect(parsed.fixture.homeTeamId).toBeNull();
    });
});
