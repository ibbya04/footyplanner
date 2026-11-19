import type { Competition, Fixture } from '@footyplanner/shared';
import { describe, expect, it } from 'vitest';
import { type Filters, viewFixtures } from './viewFixtures';

const premierLeague: Competition = {
    slug: 'eng.1',
    name: 'Premier League',
    short: 'EPL',
    group: { key: 'eng', name: 'England', color: '#a855f7' },
    featured: true,
    tbc: { weeks: 5, text: 'about 5–6 weeks before', tv: true },
    logo: null,
};

const laLiga: Competition = {
    ...premierLeague,
    slug: 'esp.1',
    name: 'LaLiga',
    short: 'LL',
    group: { key: 'esp', name: 'Spain', color: '#f59e0b' },
    tbc: { weeks: 2, text: 'only about 1–3 weeks before', tv: true },
};

const anfield = {
    name: 'Anfield',
    city: 'Liverpool',
    country: 'England',
    lat: 53.4308,
    lng: -2.9608,
    precision: 'stadium' as const,
};

const istanbul = {
    name: 'RAMS Park',
    city: 'Istanbul',
    country: 'Turkey',
    lat: 41.103,
    lng: 28.9906,
    precision: 'stadium' as const,
};

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
        venue: anfield,
        neutral: false,
        url: null,
        ...overrides,
    };
}

const weekend = { from: '2026-11-21', to: '2026-11-22' };

function noFilters(range = weekend): Filters {
    return { range, comps: 'all', day: null, search: '', timeZone: 'venue', area: null };
}

const context = { today: '2026-11-19', myZone: 'Europe/London' };

describe('viewFixtures', () => {
    it('lists every fixture in the range in kick-off order, with its competition', () => {
        const fixtures = [
            fixture('eng.1:sunday', '2026-11-22T16:30:00.000Z'),
            fixture('eng.1:next-week', '2026-11-28T15:00:00.000Z'),
            fixture('eng.1:saturday', '2026-11-21T15:00:00.000Z'),
        ];

        const view = viewFixtures(fixtures, [premierLeague], noFilters(), context);

        expect(view.fixtures.map(f => f.id)).toEqual(['eng.1:saturday', 'eng.1:sunday']);
        expect(view.fixtures[0]?.competition.name).toBe('Premier League');
    });

    it('orders fixtures with the same kick-off by competition', () => {
        const fixtures = [
            fixture('esp.1:three', '2026-11-21T15:00:00.000Z', { comp: 'esp.1' }),
            fixture('eng.1:three', '2026-11-21T15:00:00.000Z'),
        ];

        const view = viewFixtures(fixtures, [premierLeague, laLiga], noFilters(), context);

        expect(view.fixtures.map(f => f.id)).toEqual(['eng.1:three', 'esp.1:three']);
    });

    it('checks the range against the date at the venue, not in UTC', () => {
        const fixtures = [
            fixture('eng.1:istanbul-friday-utc', '2026-11-20T22:00:00.000Z', { venue: istanbul }),
            fixture('eng.1:istanbul-monday-local', '2026-11-22T21:30:00.000Z', { venue: istanbul }),
        ];

        const view = viewFixtures(fixtures, [premierLeague], noFilters(), context);

        expect(view.fixtures.map(f => f.id)).toEqual(['eng.1:istanbul-friday-utc']);
    });

    it("keeps a TBC fixture on ESPN's calendar date, since its placeholder time means nothing", () => {
        const tbc = fixture('eng.1:istanbul-tbc', '2026-11-22T23:00:00.000Z', {
            venue: istanbul,
            timeConfirmed: false,
        });

        const view = viewFixtures([tbc], [premierLeague], noFilters(), context);

        expect(view.fixtures.map(f => f.id)).toEqual(['eng.1:istanbul-tbc']);
    });

    it("shows kick-off in the venue's time zone, or in yours", () => {
        const evening = fixture('eng.1:istanbul-evening', '2026-11-21T17:00:00.000Z', { venue: istanbul });

        const atVenue = viewFixtures([evening], [premierLeague], noFilters(), context);
        const mine = viewFixtures([evening], [premierLeague], { ...noFilters(), timeZone: 'mine' }, context);

        expect(atVenue.fixtures[0]?.kickoffAt).toEqual({ date: 'Sat 21 Nov', time: '20:00', zone: 'GMT+3' });
        expect(mine.fixtures[0]?.kickoffAt).toEqual({ date: 'Sat 21 Nov', time: '17:00', zone: 'GMT' });
    });

    it('shows a TBC fixture with its date and no time', () => {
        const tbc = fixture('eng.1:tbc', '2026-11-22T00:00:00.000Z', { timeConfirmed: false });

        const view = viewFixtures([tbc], [premierLeague], noFilters(), context);

        expect(view.fixtures[0]?.kickoffAt).toEqual({ date: 'Sun 22 Nov', time: null, zone: null });
    });

    it('describes each fixture with its teams and venue, using TBD for a team not yet known', () => {
        const fixtures = [
            fixture('eng.1:known', '2026-11-21T15:00:00.000Z'),
            fixture('eng.1:unknown', '2026-11-21T17:00:00.000Z', { away: null, venue: null }),
        ];

        const view = viewFixtures(fixtures, [premierLeague], noFilters(), context);

        expect(view.fixtures.map(f => [f.title, f.venueText])).toEqual([
            ['Liverpool v Arsenal', 'Anfield, Liverpool'],
            ['Liverpool v TBD', null],
        ]);
    });

    describe('kick-off text', () => {
        const text = (f: Fixture, timeZone: 'venue' | 'mine' = 'venue') =>
            viewFixtures([f], [premierLeague], { ...noFilters(), timeZone }, context).fixtures[0]?.kickoffText;

        it('adds your own time in brackets when venue time differs from it', () => {
            const evening = fixture('eng.1:istanbul', '2026-11-21T17:00:00.000Z', { venue: istanbul });

            expect(text(evening)).toBe('Sat 21 Nov · 20:00 GMT+3 (17:00 yours)');
            expect(text(evening, 'mine')).toBe('Sat 21 Nov · 17:00 GMT');
        });

        it('leaves the brackets out when the venue is in your time zone', () => {
            expect(text(fixture('eng.1:anfield', '2026-11-21T15:00:00.000Z'))).toBe('Sat 21 Nov · 15:00 GMT');
        });

        it('says time TBC when the kick-off is not confirmed', () => {
            const tbc = fixture('eng.1:tbc', '2026-11-22T00:00:00.000Z', { timeConfirmed: false });

            expect(text(tbc)).toBe('Sun 22 Nov · time TBC');
        });
    });

    it('shows only the chosen competitions', () => {
        const fixtures = [
            fixture('eng.1:saturday', '2026-11-21T15:00:00.000Z'),
            fixture('esp.1:saturday', '2026-11-21T20:00:00.000Z', { comp: 'esp.1' }),
        ];

        const view = viewFixtures(fixtures, [premierLeague, laLiga], { ...noFilters(), comps: ['esp.1'] }, context);

        expect(view.fixtures.map(f => f.id)).toEqual(['esp.1:saturday']);
    });

    it('matches every search word against the teams, venue and competition, ignoring case', () => {
        const fixtures = [
            fixture('eng.1:liverpool-arsenal', '2026-11-21T15:00:00.000Z'),
            fixture('eng.1:istanbul', '2026-11-21T17:00:00.000Z', { venue: istanbul }),
        ];
        const search = (text: string) =>
            viewFixtures(fixtures, [premierLeague], { ...noFilters(), search: text }, context).fixtures.map(f => f.id);

        expect(search('ANFIELD')).toEqual(['eng.1:liverpool-arsenal']);
        expect(search('arsenal istanbul')).toEqual(['eng.1:istanbul']);
        expect(search('premier  turkey')).toEqual(['eng.1:istanbul']);
        expect(search('chelsea')).toEqual([]);
    });

    describe('days', () => {
        const fixtures = [
            fixture('eng.1:sat-early', '2026-11-21T12:30:00.000Z'),
            fixture('eng.1:sat-late', '2026-11-21T17:30:00.000Z'),
            fixture('eng.1:sun', '2026-11-22T16:30:00.000Z'),
        ];

        it('counts fixtures per day, and a chosen day narrows the list but not the counts', () => {
            const all = viewFixtures(fixtures, [premierLeague], noFilters(), context);
            const sunday = viewFixtures(fixtures, [premierLeague], { ...noFilters(), day: '2026-11-22' }, context);

            const counts = [
                { day: '2026-11-21', label: 'Sat 21 Nov', count: 2 },
                { day: '2026-11-22', label: 'Sun 22 Nov', count: 1 },
            ];
            expect(all.days).toEqual(counts);
            expect(sunday.days).toEqual(counts);
            expect(sunday.fixtures.map(f => f.id)).toEqual(['eng.1:sun']);
        });

        it('ignores a chosen day with no fixtures', () => {
            const view = viewFixtures(fixtures, [premierLeague], { ...noFilters(), day: '2026-11-25' }, context);

            expect(view.fixtures).toHaveLength(3);
        });

        it('groups by the day in the time zone being shown', () => {
            const lateInIstanbul = fixture('eng.1:istanbul-1am', '2026-11-20T22:30:00.000Z', { venue: istanbul });

            const view = viewFixtures([lateInIstanbul], [premierLeague], { ...noFilters(), timeZone: 'mine' }, context);

            expect(view.days.map(d => d.day)).toEqual(['2026-11-20']);
        });
    });

    it('marks fixtures whose venue is only located to its city', () => {
        const fixtures = [
            fixture('eng.1:stadium', '2026-11-21T15:00:00.000Z'),
            fixture('eng.1:city', '2026-11-21T17:00:00.000Z', { venue: { ...anfield, precision: 'city' } }),
        ];

        const view = viewFixtures(fixtures, [premierLeague], noFilters(), context);

        expect(view.fixtures.map(f => [f.id, f.approximate])).toEqual([
            ['eng.1:stadium', false],
            ['eng.1:city', true],
        ]);
    });

    it('with an area set, shows only fixtures located inside it', () => {
        const fixtures = [
            fixture('eng.1:liverpool', '2026-11-21T15:00:00.000Z'),
            fixture('eng.1:istanbul', '2026-11-21T17:00:00.000Z', { venue: istanbul }),
            fixture('eng.1:unlocated', '2026-11-21T19:00:00.000Z', { venue: { ...anfield, lat: null, lng: null } }),
        ];
        const britain = { south: 49.9, west: -8.6, north: 60.9, east: 1.8 };

        const view = viewFixtures(fixtures, [premierLeague], { ...noFilters(), area: britain }, context);

        expect(view.fixtures.map(f => f.id)).toEqual(['eng.1:liverpool']);
    });

    it('uses the Canary and Azores time zones for venues out in the Atlantic', () => {
        const laspalmas = { ...anfield, name: 'Estadio de Gran Canaria', country: 'Spain', lat: 28.1, lng: -15.45 };
        const azores = { ...anfield, name: 'Estádio de São Miguel', country: 'Portugal', lat: 37.74, lng: -25.66 };
        const fixtures = [
            fixture('esp.1:las-palmas', '2026-11-21T15:00:00.000Z', { venue: laspalmas }),
            fixture('esp.1:azores', '2026-11-21T15:00:00.000Z', { venue: azores }),
        ];

        const view = viewFixtures(fixtures, [premierLeague], noFilters(), context);

        expect(view.fixtures.map(f => f.kickoffAt.time)).toEqual(['15:00', '14:00']);
    });

    describe('TBC guidance', () => {
        const winter = { from: '2026-11-19', to: '2027-01-17' };
        const tbcOn = (day: string, overrides: Partial<Fixture> = {}) =>
            fixture(`eng.1:${day}`, `${day}T00:00:00.000Z`, { timeConfirmed: false, ...overrides });
        const guidance = (f: Fixture, competition = premierLeague) =>
            viewFixtures([f], [competition], noFilters(winter), context).fixtures[0]?.tbc;

        it("says when the competition usually confirms times, counted back from the fixture's date", () => {
            expect(guidance(tbcOn('2026-12-26'))).toEqual({
                short: 'Kick-off time usually confirmed around Sat 21 Nov',
                long:
                    'Kick-off time not confirmed yet. Premier League times are usually set about 5–6 weeks before, ' +
                    'so expect it around Sat 21 Nov. The fixture can also move to another day of that weekend for TV. ' +
                    'Avoid non-refundable bookings that depend on the exact time.',
            });
        });

        it('says the time is due any day once that date has passed', () => {
            expect(guidance(tbcOn('2026-12-10'))).toMatchObject({
                short: 'Kick-off time due to be announced any day',
                long: expect.stringContaining('so it should be announced any day now.'),
            });
        });

        it("leaves out the TV warning for competitions whose fixtures don't move for TV", () => {
            const uefa = { ...premierLeague, tbc: { weeks: 4, text: 'when UEFA publishes the schedule', tv: false } };

            expect(guidance(tbcOn('2026-12-26'), uefa)?.long).not.toContain('TV');
        });

        it('gives no guidance for confirmed, started or postponed fixtures', () => {
            const postponed = { state: 'pre' as const, name: 'STATUS_POSTPONED', detail: null };
            const started = { state: 'in' as const, name: 'STATUS_FIRST_HALF', detail: "12'" };

            expect(guidance(tbcOn('2026-12-26', { timeConfirmed: true }))).toBeNull();
            expect(guidance(tbcOn('2026-12-26', { status: postponed }))).toBeNull();
            expect(guidance(tbcOn('2026-12-26', { status: started }))).toBeNull();
        });
    });
});
