import { addDays, type DateRange } from '../dates';
import { dateLabel } from './timeZones';
import { MAX_RANGE_DAYS } from './urlFilters';

export interface CalendarDay {
    day: string;
    date: number;
    label: string;
    inRange: boolean;
    start: boolean;
    end: boolean;
    today: boolean;
    disabled: boolean;
}

export interface CalendarMonth {
    title: string;
    blanks: number;
    days: CalendarDay[];
}

export interface CalendarState {
    month: string;
    range: DateRange;
    anchor: string | null;
    hover: string | null;
    today: string;
}

export type Pick = { anchor: string } | { range: DateRange };

const DAY = 86_400_000;

const utc = (day: string) => new Date(`${day}T00:00:00Z`);

function format(day: string, options: Intl.DateTimeFormatOptions): string {
    return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', ...options }).format(utc(day));
}

function shortDay(day: string, withYear: boolean): string {
    return format(day, { day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}) });
}

export function rangeLabel(range: DateRange, today: string): { text: string; days: string } {
    const count = Math.round((utc(range.to).getTime() - utc(range.from).getTime()) / DAY) + 1;
    const days = `${count} day${count > 1 ? 's' : ''}`;
    const endYear = range.to.slice(0, 4) !== today.slice(0, 4);
    if (range.from === range.to) return { text: shortDay(range.to, endYear), days };
    if (range.from.slice(0, 7) === range.to.slice(0, 7)) {
        return { text: `${format(range.from, { day: 'numeric' })}–${shortDay(range.to, endYear)}`, days };
    }
    const startYear = range.from.slice(0, 4) !== range.to.slice(0, 4);
    return { text: `${shortDay(range.from, startYear)} – ${shortDay(range.to, endYear)}`, days };
}

export const monthOf = (day: string) => day.slice(0, 7);

export function shiftMonth(month: string, by: number): string {
    const [year = 0, mon = 1] = month.split('-').map(Number);
    return new Date(Date.UTC(year, mon - 1 + by, 1)).toISOString().slice(0, 7);
}

function shownRange({ range, anchor, hover }: CalendarState): DateRange {
    if (!anchor) return range;
    return { from: anchor, to: hover && hover >= anchor ? hover : anchor };
}

function daysInMonth(month: string): number {
    const [year = 0, mon = 1] = month.split('-').map(Number);
    return new Date(Date.UTC(year, mon, 0)).getUTCDate();
}

export function calendarMonth(state: CalendarState): CalendarMonth {
    const first = `${state.month}-01`;
    const length = daysInMonth(state.month);
    const { from, to } = shownRange(state);
    const lastPickable = state.anchor ? addDays(state.anchor, MAX_RANGE_DAYS - 1) : null;
    const days = Array.from({ length }, (_, i): CalendarDay => {
        const day = addDays(first, i);
        return {
            day,
            date: i + 1,
            label: dateLabel(day),
            inRange: day >= from && day <= to,
            start: day === from,
            end: day === to,
            today: day === state.today,
            disabled: lastPickable !== null && day > lastPickable,
        };
    });
    return {
        title: format(first, { month: 'long', year: 'numeric' }),
        blanks: (utc(first).getUTCDay() + 6) % 7,
        days,
    };
}

export function pickDay(anchor: string | null, day: string): Pick {
    if (!anchor || day < anchor) return { anchor: day };
    return { range: { from: anchor, to: day } };
}
