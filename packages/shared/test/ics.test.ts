import { describe, expect, it } from 'vitest';
import { buildIcs, type CalendarFixture, type Competition } from '../src';

const premierLeague: Competition = {
    slug: 'eng.1',
    name: 'Premier League',
    short: 'EPL',
    group: { key: 'eng', name: 'England', color: '#a855f7' },
    featured: true,
    tbc: { weeks: 5, text: 'about 5–6 weeks before', tv: true },
    logo: null,
};

function fixture(overrides: Partial<CalendarFixture> = {}): CalendarFixture {
    return {
        id: 'eng.1:740001',
        kickoff: '2026-11-21T15:00:00.000Z',
        timeConfirmed: true,
        day: '2026-11-21',
        title: 'Liverpool v Arsenal',
        competition: premierLeague,
        venueText: 'Anfield, Liverpool',
        venue: {
            name: 'Anfield',
            city: 'Liverpool',
            country: 'England',
            lat: 53.4308,
            lng: -2.9608,
            precision: 'stadium',
        },
        url: 'https://www.espn.co.uk/football/match/_/gameId/740001',
        ...overrides,
    };
}

const now = new Date('2026-11-19T12:00:00.000Z');

const lines = (ics: string) => ics.split('\r\n');

describe('buildIcs', () => {
    it('writes a two-hour event for a fixture with a confirmed kick-off', () => {
        expect(buildIcs([fixture()], now)).toBe(
            [
                'BEGIN:VCALENDAR',
                'VERSION:2.0',
                'PRODID:-//footyplanner//EN',
                'CALSCALE:GREGORIAN',
                'BEGIN:VEVENT',
                'UID:eng.1-740001@footyplanner',
                'DTSTAMP:20261119T120000Z',
                'DTSTART:20261121T150000Z',
                'DTEND:20261121T170000Z',
                'SUMMARY:Liverpool v Arsenal (Premier League)',
                'LOCATION:Anfield\\, Liverpool',
                'DESCRIPTION:Match centre: https://www.espn.co.uk/football/match/_/gameId/74',
                ' 0001\\nAdded from footyplanner',
                'GEO:53.43080;-2.96080',
                'END:VEVENT',
                'END:VCALENDAR',
                '',
            ].join('\r\n'),
        );
    });

    it('writes an all-day event on the venue day while the kick-off time is TBC', () => {
        const tbc = fixture({ kickoff: '2026-12-27T00:00:00.000Z', timeConfirmed: false, day: '2026-12-26' });

        const event = lines(buildIcs([tbc], now));

        expect(event).toContain('DTSTART;VALUE=DATE:20261226');
        expect(event).toContain('DTEND;VALUE=DATE:20261227');
        expect(event).toContain('SUMMARY:Liverpool v Arsenal (Premier League) (time TBC)');
        expect(event.join('\r\n')).toContain(
            'DESCRIPTION:Kick-off time not confirmed yet\\; check before you travel.\\nMa',
        );
    });

    it('escapes commas, semicolons and backslashes, and leaves out GEO for a venue not on the map', () => {
        const odd = fixture({
            title: 'Brighton & Hove Albion v Nott\\m Forest; replay',
            venueText: null,
            venue: null,
            url: null,
        });

        const event = lines(buildIcs([odd], now));

        expect(event).toContain('SUMMARY:Brighton & Hove Albion v Nott\\\\m Forest\\; replay (Premier League)');
        expect(event).toContain('LOCATION:');
        expect(event).toContain('DESCRIPTION:Added from footyplanner');
        expect(event.some(line => line.startsWith('GEO:'))).toBe(false);
    });

    it('folds long lines to at most 75 bytes without splitting a character', () => {
        const long = fixture({
            venueText: 'Estádio do Sport Lisboa e Benfica (Estádio da Luz), São Domingos de Benfica, Lisboa',
        });

        const ics = buildIcs([long], now);
        const encoded = lines(ics).map(line => new TextEncoder().encode(line).length);

        expect(Math.max(...encoded)).toBeLessThanOrEqual(75);
        expect(ics.replace(/\r\n /g, '')).toContain(
            'LOCATION:Estádio do Sport Lisboa e Benfica (Estádio da Luz)\\, São Domingos de Benfica\\, Lisboa',
        );
    });

    it('writes one event per fixture', () => {
        const ics = buildIcs([fixture(), fixture({ id: 'esp.1:740002' })], now);

        expect(lines(ics).filter(line => line === 'BEGIN:VEVENT')).toHaveLength(2);
        expect(ics).toContain('UID:esp.1-740002@footyplanner');
    });

    it('names a subscribed calendar and tells calendar apps to check back every hour', () => {
        const ics = lines(buildIcs([fixture()], now, { name: 'Northern; weekend', refreshHours: 1 }));

        expect(ics.slice(0, 8)).toEqual([
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//footyplanner//EN',
            'CALSCALE:GREGORIAN',
            'X-WR-CALNAME:Northern\\; weekend',
            'NAME:Northern\\; weekend',
            'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
            'X-PUBLISHED-TTL:PT1H',
        ]);
    });
});
