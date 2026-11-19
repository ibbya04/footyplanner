import type { Competition, Fixture } from '@footyplanner/shared';
import { addDays } from '../dates';
import { dateLabel } from './timeZones';

export interface TbcGuidance {
    short: string;
    long: string;
}

export function tbcGuidance(
    fixture: Fixture,
    competition: Competition,
    day: string,
    today: string,
): TbcGuidance | null {
    if (fixture.timeConfirmed || fixture.status.state !== 'pre' || fixture.status.name === 'STATUS_POSTPONED') {
        return null;
    }
    const { weeks, text, tv } = competition.tbc;
    const expected = addDays(day, -7 * weeks);
    const due = expected <= today;
    const around = dateLabel(expected);
    return {
        short: due ? 'Kick-off time due to be announced any day' : `Kick-off time usually confirmed around ${around}`,
        long: [
            `Kick-off time not confirmed yet. ${competition.name} times are usually set ${text}, so ${
                due ? 'it should be announced any day now.' : `expect it around ${around}.`
            }`,
            tv ? 'The match can also move to another day of that weekend for TV.' : null,
            'Avoid non-refundable bookings that depend on the exact time.',
        ]
            .filter(Boolean)
            .join(' '),
    };
}
