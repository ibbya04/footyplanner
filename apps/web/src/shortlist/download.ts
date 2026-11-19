import { buildIcs, type CalendarFixture } from './ics';

export function downloadIcs(fixtures: CalendarFixture[], filename: string): void {
    if (!fixtures.length) return;
    const url = URL.createObjectURL(new Blob([buildIcs(fixtures, new Date())], { type: 'text/calendar' }));
    const link = Object.assign(document.createElement('a'), { href: url, download: filename });
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function icsFilename(fixture: CalendarFixture): string {
    return `${fixture.title.replace(/\W+/g, '-').toLowerCase()}.ics`;
}
