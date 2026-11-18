const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function monthOf(ms: number): string {
    return new Date(ms).toISOString().slice(0, 7);
}

export function addMonths(month: string, n: number): string {
    const [y, m] = month.split('-').map(Number) as [number, number];
    const d = new Date(Date.UTC(y, m - 1 + n, 1));
    return d.toISOString().slice(0, 7);
}

export function monthsBetween(from: string, to: string): number {
    const [fy, fm] = from.split('-').map(Number) as [number, number];
    const [ty, tm] = to.split('-').map(Number) as [number, number];
    return (ty - fy) * 12 + (tm - fm);
}

export function monthWindow(month: string): { from: string; to: string } {
    return { from: `${month}-01T00:00:00.000Z`, to: `${addMonths(month, 1)}-01T00:00:00.000Z` };
}
export function dayWindow(day: string): { from: string; to: string } {
    const next = new Date(Date.parse(`${day}T00:00:00.000Z`) + DAY).toISOString();
    return { from: `${day}T00:00:00.000Z`, to: next };
}

export function queueMonths(seasonStart: string, now: number, horizon: number): string[] {
    const last = addMonths(monthOf(now), horizon);
    const months: string[] = [];
    for (let m = seasonStart; monthsBetween(m, last) >= 0; m = addMonths(m, 1)) months.push(m);
    return months;
}

export function refreshDelay(month: string, now: number): number {
    const ahead = monthsBetween(monthOf(now), month);
    if (ahead < -1) return 7 * DAY;
    if (ahead === -1) return DAY;
    if (ahead === 0) return 3 * HOUR;
    if (ahead === 1) return 6 * HOUR;
    if (ahead <= 3) return 12 * HOUR;
    return DAY;
}

export function retryDelay(failures: number): number {
    return Math.min(15 * MINUTE * 2 ** Math.max(0, failures - 1), 6 * HOUR);
}

export const CLAIM_LEASE = 10 * MINUTE;
