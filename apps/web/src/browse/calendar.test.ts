import { describe, expect, it } from 'vitest';
import { calendarMonth, monthOf, pickDay, rangeLabel, shiftMonth } from './calendar';

const today = '2026-11-19';
const range = { from: '2026-11-21', to: '2026-11-27' };

describe('rangeLabel', () => {
    it('shortens a range within one month and counts its days', () => {
        expect(rangeLabel(range, today)).toEqual({ text: '21–27 Nov', days: '7 days' });
    });

    it('names both months across a month end, and one day on its own', () => {
        expect(rangeLabel({ from: '2026-11-28', to: '2026-12-04' }, today).text).toBe('28 Nov – 4 Dec');
        expect(rangeLabel({ from: '2026-11-28', to: '2026-11-28' }, today)).toEqual({ text: '28 Nov', days: '1 day' });
    });

    it('adds the year when the range ends in another year', () => {
        expect(rangeLabel({ from: '2026-12-28', to: '2027-01-03' }, today).text).toBe('28 Dec 2026 – 3 Jan 2027');
        expect(rangeLabel({ from: '2027-01-02', to: '2027-01-03' }, today).text).toBe('2–3 Jan 2027');
    });
});

describe('calendarMonth', () => {
    it('lays the month out in weeks starting on Monday', () => {
        const november = calendarMonth({ month: '2026-11', range, anchor: null, hover: null, today });

        expect(november.title).toBe('November 2026');
        expect(november.blanks).toBe(6);
        expect(november.days).toHaveLength(30);
        expect(calendarMonth({ month: '2026-12', range, anchor: null, hover: null, today }).blanks).toBe(1);
    });

    it('marks the chosen range, its ends and today', () => {
        const { days } = calendarMonth({ month: '2026-11', range, anchor: null, hover: null, today });
        const marked = days.filter(d => d.inRange || d.today).map(d => [d.date, d.start, d.end, d.today]);

        expect(marked).toEqual([
            [19, false, false, true],
            [21, true, false, false],
            [22, false, false, false],
            [23, false, false, false],
            [24, false, false, false],
            [25, false, false, false],
            [26, false, false, false],
            [27, false, true, false],
        ]);
        expect(days[20]?.label).toBe('Sat 21 Nov');
    });

    it('while picking an end, previews the range up to the hovered day', () => {
        const { days } = calendarMonth({ month: '2026-11', range, anchor: '2026-11-10', hover: '2026-11-12', today });

        expect(days.filter(d => d.inRange).map(d => d.date)).toEqual([10, 11, 12]);
        expect(days.find(d => d.date === 10)?.start).toBe(true);
        expect(days.find(d => d.date === 12)?.end).toBe(true);
    });

    it('disables days more than 62 days after the start being picked', () => {
        const { days } = calendarMonth({ month: '2027-01', range, anchor: '2026-11-05', hover: null, today });

        expect(days.find(d => d.date === 5)?.disabled).toBe(false);
        expect(days.find(d => d.date === 6)?.disabled).toBe(true);
    });

    it('disables nothing when no start is being picked', () => {
        const { days } = calendarMonth({ month: '2027-06', range, anchor: null, hover: null, today });

        expect(days.some(d => d.disabled)).toBe(false);
    });
});

describe('pickDay', () => {
    it('starts a range on the first pick, and on a pick before the start', () => {
        expect(pickDay(null, '2026-11-10')).toEqual({ anchor: '2026-11-10' });
        expect(pickDay('2026-11-10', '2026-11-08')).toEqual({ anchor: '2026-11-08' });
    });

    it('finishes the range on a pick from the start onwards', () => {
        expect(pickDay('2026-11-10', '2026-11-14')).toEqual({ range: { from: '2026-11-10', to: '2026-11-14' } });
        expect(pickDay('2026-11-10', '2026-11-10')).toEqual({ range: { from: '2026-11-10', to: '2026-11-10' } });
    });
});

describe('months', () => {
    it('opens on the month a range starts in, and steps across years', () => {
        expect(monthOf('2026-11-21')).toBe('2026-11');
        expect(shiftMonth('2026-12', 1)).toBe('2027-01');
        expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    });
});
