import { addDays, type DateRange, nextDays } from '../dates';
import type { Filters } from './viewFixtures';

export type UrlFilters = Omit<Filters, 'area'> & { inView: boolean };

export interface UrlContext {
    competitions: string[];
    today: string;
}

const DEFAULT_DAYS = 7;
export const MAX_RANGE_DAYS = 62;

export function defaultRange(today: string): DateRange {
    return nextDays(today, DEFAULT_DAYS);
}

function isDay(value: string | null): value is string {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const ms = Date.parse(`${value}T00:00:00Z`);
    return !isNaN(ms) && new Date(ms).toISOString().startsWith(value);
}

function readRange(params: URLSearchParams, today: string): DateRange {
    const from = params.get('from');
    const to = params.get('to');
    if (!isDay(from) || !isDay(to) || to < from) return defaultRange(today);
    const last = addDays(from, MAX_RANGE_DAYS - 1);
    return { from, to: to > last ? last : to };
}

function readComps(params: URLSearchParams, known: string[]): UrlFilters['comps'] {
    const comps = (params.get('comps') ?? '').split(',').filter(slug => known.includes(slug));
    return comps.length ? comps.sort() : 'all';
}

function readDay(params: URLSearchParams, range: DateRange): string | null {
    const day = params.get('day');
    return isDay(day) && day >= range.from && day <= range.to ? day : null;
}

export function readFilters(params: URLSearchParams, context: UrlContext): UrlFilters {
    const range = readRange(params, context.today);
    return {
        range,
        comps: readComps(params, context.competitions),
        day: readDay(params, range),
        search: params.get('q') ?? '',
        timeZone: params.get('tz') === 'mine' ? 'mine' : 'venue',
        inView: params.get('in') === 'map',
    };
}

export function writeFilters(filters: UrlFilters, context: UrlContext): URLSearchParams {
    const params = new URLSearchParams();
    const standard = defaultRange(context.today);
    if (filters.range.from !== standard.from || filters.range.to !== standard.to) {
        params.set('from', filters.range.from);
        params.set('to', filters.range.to);
    }
    if (filters.comps !== 'all') params.set('comps', [...filters.comps].sort().join(','));
    if (filters.day) params.set('day', filters.day);
    if (filters.search) params.set('q', filters.search);
    if (filters.timeZone === 'mine') params.set('tz', 'mine');
    if (filters.inView) params.set('in', 'map');
    return params;
}
