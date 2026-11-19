import type { Fixture, VenueRef } from '@footyplanner/shared';
import { describe, expect, it } from 'vitest';
import { legs } from './itinerary';

const anfield: VenueRef = {
    name: 'Anfield',
    city: 'Liverpool',
    country: 'England',
    lat: 53.4308,
    lng: -2.9608,
    precision: 'stadium',
};

const etihad: VenueRef = { ...anfield, name: 'Etihad Stadium', city: 'Manchester', lat: 53.4831, lng: -2.2004 };

function fixture(id: string, kickoff: string, venue: VenueRef | null, overrides: Partial<Fixture> = {}): Fixture {
    return {
        id,
        comp: 'eng.1',
        kickoff,
        timeConfirmed: true,
        status: { state: 'pre', name: 'STATUS_SCHEDULED', detail: null },
        home: null,
        away: null,
        score: null,
        venue,
        neutral: false,
        url: null,
        ...overrides,
    };
}

describe('legs', () => {
    it('gives the travel between each pair of fixtures, with no warning when there is time', () => {
        const trip = [
            fixture('a', '2026-11-21T12:30:00.000Z', anfield),
            fixture('b', '2026-11-21T17:30:00.000Z', etihad),
        ];

        expect(legs(trip)).toEqual([{ text: '51 km · ≈55 min drive', warning: false }]);
    });

    it('warns when two fixtures kick off at the same time', () => {
        const trip = [
            fixture('a', '2026-11-21T15:00:00.000Z', anfield),
            fixture('b', '2026-11-21T15:00:00.000Z', etihad),
        ];

        expect(legs(trip)).toEqual([{ text: 'Same kick-off time: you can only see one of these', warning: true }]);
    });

    it('warns when kick-offs are less than two hours apart', () => {
        const trip = [
            fixture('a', '2026-11-21T12:30:00.000Z', anfield),
            fixture('b', '2026-11-21T14:00:00.000Z', anfield),
        ];

        expect(legs(trip)).toEqual([{ text: 'Kick-offs overlap: only 1h 30m apart', warning: true }]);
    });

    it("warns when there isn't time to travel after the first final whistle", () => {
        const bernabeu = { ...anfield, name: 'Santiago Bernabéu', city: 'Madrid', lat: 40.4531, lng: -3.6883 };
        const trip = [
            fixture('a', '2026-11-21T12:30:00.000Z', anfield),
            fixture('b', '2026-11-21T17:30:00.000Z', bernabeu),
        ];

        expect(legs(trip)).toEqual([
            {
                text: "Can't make both: 1444 km · ≈5h door to door by air, but only 3h after the first final whistle",
                warning: true,
            },
        ]);
    });

    it('warns when travelling leaves under an hour to spare', () => {
        const trip = [
            fixture('a', '2026-11-21T12:30:00.000Z', anfield),
            fixture('b', '2026-11-21T15:30:00.000Z', etihad),
        ];

        expect(legs(trip)).toEqual([
            { text: 'Tight: 51 km · ≈55 min drive with under an hour to spare', warning: true },
        ]);
    });

    it('does not call a double-header at the same ground tight', () => {
        const trip = [
            fixture('a', '2026-11-21T12:30:00.000Z', anfield),
            fixture('b', '2026-11-21T15:00:00.000Z', anfield),
        ];

        expect(legs(trip)).toEqual([{ text: 'Same stadium', warning: false }]);
    });

    it("gives the travel without warnings while a kick-off time isn't confirmed", () => {
        const trip = [
            fixture('a', '2026-11-21T15:00:00.000Z', anfield),
            fixture('b', '2026-11-21T15:00:00.000Z', etihad, { timeConfirmed: false }),
        ];

        expect(legs(trip)).toEqual([{ text: '51 km · ≈55 min drive · times not confirmed yet', warning: false }]);
    });

    it('has no leg next to a fixture whose venue is not on the map', () => {
        const trip = [
            fixture('a', '2026-11-21T12:30:00.000Z', anfield),
            fixture('b', '2026-11-22T12:30:00.000Z', null),
            fixture('c', '2026-11-23T12:30:00.000Z', etihad),
        ];

        expect(legs(trip)).toEqual([null, null]);
    });
});
