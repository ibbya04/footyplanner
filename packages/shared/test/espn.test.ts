import { describe, expect, it } from 'vitest';
import { leagueLogo, slimEvent, type EspnEvent } from '../src';

const event: EspnEvent = {
    id: '740123',
    date: '2026-11-22T15:00Z',
    timeValid: true,
    status: { type: { state: 'pre', name: 'STATUS_SCHEDULED', shortDetail: '11/22 - 3:00 PM', detail: 'Sun 3pm' } },
    links: [
        { rel: ['live', 'desktop'], href: 'https://espn.com/live' },
        { rel: ['summary', 'desktop'], href: 'https://espn.com/summary' },
        { rel: ['summary', 'app'], href: 'espn://summary' },
    ],
    competitions: [
        {
            date: '2026-11-22T15:00Z',
            timeValid: true,
            neutralSite: false,
            venue: { fullName: 'Emirates Stadium', address: { city: 'London', country: 'England' } },
            competitors: [
                {
                    homeAway: 'home',
                    score: '0',
                    team: { displayName: 'Arsenal', abbreviation: 'ARS', logos: [{ href: 'https://a/ars.png' }] },
                },
                { homeAway: 'away', score: '0', team: { displayName: 'Chelsea', logo: 'https://a/che.png' } },
            ],
        },
    ],
};

describe('slimEvent', () => {
    it('keeps only the first summary link', () => {
        expect(slimEvent(event).links).toEqual([{ rel: ['summary', 'desktop'], href: 'https://espn.com/summary' }]);
    });

    it('takes the team logo from logos when logo is missing', () => {
        const [home, away] = slimEvent(event).competitions![0]!.competitors!;
        expect(home!.team!.logo).toBe('https://a/ars.png');
        expect(away!.team!.logo).toBe('https://a/che.png');
    });

    it('drops fields the page does not use', () => {
        const noisy = { ...event, season: { year: 2026 }, uid: 'x' } as EspnEvent;
        expect(Object.keys(slimEvent(noisy)).sort()).toEqual([
            'competitions',
            'date',
            'id',
            'links',
            'status',
            'timeValid',
        ]);
    });

    it('copes with an event that has no competitions', () => {
        const slim = slimEvent({ id: '1' });
        expect(slim.competitions).toEqual([
            { date: undefined, timeValid: undefined, neutralSite: undefined, venue: undefined, competitors: [] },
        ]);
    });
});

describe('leagueLogo', () => {
    it('prefers the default light logo', () => {
        const logos = [
            { href: 'dark.png', rel: ['full', 'dark'] },
            { href: 'default.png', rel: ['full', 'default'] },
        ];
        expect(leagueLogo([{ logos }])).toBe('default.png');
    });

    it('falls back to the first logo, then league.logo', () => {
        expect(leagueLogo([{ logos: [{ href: 'first.png', rel: ['full'] }] }])).toBe('first.png');
        expect(leagueLogo([{ logo: 'plain.png' }])).toBe('plain.png');
        expect(leagueLogo([])).toBeNull();
        expect(leagueLogo(undefined)).toBeNull();
    });
});
