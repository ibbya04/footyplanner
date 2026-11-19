import type { Competition, Fixture } from './api';

export type CalendarFixture = Pick<Fixture, 'id' | 'kickoff' | 'timeConfirmed' | 'venue' | 'url'> & {
    day: string;
    title: string;
    competition: Pick<Competition, 'name'>;
    venueText: string | null;
};

const MATCH_MS = 2 * 3_600_000;
const MAX_LINE_BYTES = 75;
const encoder = new TextEncoder();

function escape(text: string): string {
    return text
        .replace(/\\/g, '\\\\')
        .replace(/\n/g, '\\n')
        .replace(/([,;])/g, '\\$1');
}

function stamp(date: Date): string {
    return date
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(/\.\d{3}/, '');
}

function fold(line: string): string {
    const parts: string[] = [];
    let current = '';
    let bytes = 0;
    for (const char of line) {
        const size = encoder.encode(char).length;
        if (bytes + size > MAX_LINE_BYTES) {
            parts.push(current);
            current = ' ';
            bytes = 1;
        }
        current += char;
        bytes += size;
    }
    return [...parts, current].join('\r\n');
}

const dateValue = (day: string) => day.replaceAll('-', '');

const nextDay = (day: string) => new Date(Date.parse(`${day}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);

function when(fixture: CalendarFixture): string[] {
    if (!fixture.timeConfirmed) {
        return [`DTSTART;VALUE=DATE:${dateValue(fixture.day)}`, `DTEND;VALUE=DATE:${dateValue(nextDay(fixture.day))}`];
    }
    const start = new Date(fixture.kickoff);
    return [`DTSTART:${stamp(start)}`, `DTEND:${stamp(new Date(start.getTime() + MATCH_MS))}`];
}

function event(fixture: CalendarFixture, now: Date): string[] {
    const tbc = !fixture.timeConfirmed;
    const description = [
        tbc && 'Kick-off time not confirmed yet; check before you travel.',
        fixture.url && `Match centre: ${fixture.url}`,
        'Added from footyplanner',
    ].filter(Boolean);
    const { lat, lng } = fixture.venue ?? {};
    return [
        'BEGIN:VEVENT',
        `UID:${fixture.id.replace(/[^\w.-]/g, '-')}@footyplanner`,
        `DTSTAMP:${stamp(now)}`,
        ...when(fixture),
        `SUMMARY:${escape(`${fixture.title} (${fixture.competition.name})${tbc ? ' (time TBC)' : ''}`)}`,
        `LOCATION:${escape(fixture.venueText ?? '')}`,
        `DESCRIPTION:${escape(description.join('\n'))}`,
        ...(lat != null && lng != null ? [`GEO:${lat.toFixed(5)};${lng.toFixed(5)}`] : []),
        'END:VEVENT',
    ];
}

export interface CalendarOptions {
    name?: string;
    refreshHours?: number;
}

function calendarHeader({ name, refreshHours }: CalendarOptions): string[] {
    return [
        ...(name ? [`X-WR-CALNAME:${escape(name)}`, `NAME:${escape(name)}`] : []),
        ...(refreshHours
            ? [`REFRESH-INTERVAL;VALUE=DURATION:PT${refreshHours}H`, `X-PUBLISHED-TTL:PT${refreshHours}H`]
            : []),
    ];
}

export function buildIcs(fixtures: CalendarFixture[], now: Date, options: CalendarOptions = {}): string {
    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//footyplanner//EN',
        'CALSCALE:GREGORIAN',
        ...calendarHeader(options),
        ...fixtures.flatMap(fixture => event(fixture, now)),
        'END:VCALENDAR',
    ];
    return `${lines.map(fold).join('\r\n')}\r\n`;
}
