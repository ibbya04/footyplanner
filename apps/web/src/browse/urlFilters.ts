import { addDays, type DateRange, nextDays } from '../dates';
import type { Filters, Near } from './viewFixtures';

export type UrlFilters = Omit<Filters, 'area'> & { inView: boolean };

export interface UrlContext {
    competitions: string[];
    today: string;
}

const DEFAULT_DAYS = 7;
export const MAX_RANGE_DAYS = 62;
export const RADII_KM = [25, 50, 100, 200, 400];
export const DEFAULT_RADIUS_KM = 100;

export function defaultRange(today: string): DateRange {
    return nextDays(today, DEFAULT_DAYS);
}

function isDay(value: string | null): value is string {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const ms = Date.parse(`${value}T00:00:00Z`);
    return !isNaN(ms) && new Date(ms).toISOString().startsWith(value);
}

export function fitRange(from: string, to: string): DateRange {
    const last = addDays(from, MAX_RANGE_DAYS - 1);
    return { from, to: to < from ? from : to > last ? last : to };
}

function readRange(params: URLSearchParams, today: string): DateRange {
    const from = params.get('from');
    const to = params.get('to');
    if (!isDay(from) || !isDay(to) || to < from) return defaultRange(today);
    return fitRange(from, to);
}

function readComps(params: URLSearchParams, known: string[]): UrlFilters['comps'] {
    const comps = [...new Set((params.get('comps') ?? '').split(','))].filter(slug => known.includes(slug));
    return comps.length && comps.length < new Set(known).size ? comps.sort() : 'all';
}

function readDay(params: URLSearchParams): string | null {
    const day = params.get('day');
    return isDay(day) ? day : null;
}

const isLat = (n: number) => Number.isFinite(n) && Math.abs(n) <= 90;
const isLng = (n: number) => Number.isFinite(n) && Math.abs(n) <= 180;

function readNear(params: URLSearchParams): Near | null {
    const [lat, lng, radius, ...name] = (params.get('n') ?? '').split(',');
    const place = { lat: Number(lat), lng: Number(lng), name: name.join(',') };
    if (!lat || !lng || !isLat(place.lat) || !isLng(place.lng) || !place.name) return null;
    const km = Number(radius);
    return { ...place, radius: RADII_KM.includes(km) ? km : DEFAULT_RADIUS_KM };
}

function writeNear(near: Near): string {
    return [near.lat.toFixed(4), near.lng.toFixed(4), near.radius, near.name].join(',');
}

export function readFilters(params: URLSearchParams, context: UrlContext): UrlFilters {
    const range = readRange(params, context.today);
    const near = readNear(params);
    return {
        range,
        comps: readComps(params, context.competitions),
        day: readDay(params),
        search: params.get('q') ?? '',
        timeZone: params.get('tz') === 'mine' ? 'mine' : 'venue',
        inView: params.get('in') === 'map',
        near,
        sort: near && params.get('sort') === 'distance' ? 'distance' : 'time',
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
    if (filters.near) params.set('n', writeNear(filters.near));
    if (filters.near && filters.sort === 'distance') params.set('sort', 'distance');
    return params;
}
