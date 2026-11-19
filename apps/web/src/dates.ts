const DAY = 86_400_000;

export interface DateRange {
    from: string;
    to: string;
}

const isoDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function nextDays(days: number, now = Date.now()): DateRange {
    return { from: isoDate(now), to: isoDate(now + (days - 1) * DAY) };
}

export function kickoffLabel(iso: string, timeConfirmed: boolean): string {
    const date = new Date(iso);
    const day = date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
    if (!timeConfirmed) return `${day} · time TBC`;
    return `${day} · ${date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
}
