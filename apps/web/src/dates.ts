export interface DateRange {
    from: string;
    to: string;
}

const DAY = 86_400_000;

export function localToday(now = new Date()): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function addDays(day: string, days: number): string {
    return new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);
}

export function nextDays(today: string, days: number): DateRange {
    return { from: today, to: addDays(today, days - 1) };
}

export function thisWeekend(today: string): DateRange {
    const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
    if (weekday === 0) return { from: today, to: today };
    const friday = addDays(today, weekday === 6 ? -1 : 5 - weekday);
    return { from: friday < today ? today : friday, to: addDays(friday, 2) };
}

export const myZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
