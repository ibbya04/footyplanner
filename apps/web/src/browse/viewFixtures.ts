import type { Competition, Fixture } from '@footyplanner/shared';
import type { DateRange } from '../dates';
import { type TbcGuidance, tbcGuidance } from './tbc';
import { dateLabel, dayIn, timeIn, venueZone, zoneName } from './timeZones';

export interface Area {
    south: number;
    west: number;
    north: number;
    east: number;
}

export interface Filters {
    range: DateRange;
    comps: 'all' | string[];
    day: string | null;
    search: string;
    timeZone: 'venue' | 'mine';
    area: Area | null;
}

export interface ViewContext {
    today: string;
    myZone: string;
}

export interface KickoffAt {
    date: string;
    time: string | null;
    zone: string | null;
}

export interface FixtureView extends Fixture {
    competition: Competition;
    day: string;
    kickoffAt: KickoffAt;
    tbc: TbcGuidance | null;
    approximate: boolean;
}

export interface DayCount {
    day: string;
    label: string;
    count: number;
}

export interface FixturesView {
    days: DayCount[];
    fixtures: FixtureView[];
}

function countDays(views: FixtureView[]): DayCount[] {
    const counts = new Map<string, number>();
    for (const view of views) counts.set(view.day, (counts.get(view.day) ?? 0) + 1);
    return [...counts]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([day, count]) => ({ day, label: dateLabel(day), count }));
}

function fixtureDay(fixture: Fixture, zone: string): string {
    return fixture.timeConfirmed ? dayIn(zone, fixture.kickoff) : fixture.kickoff.slice(0, 10);
}

function kickoffAt(fixture: Fixture, zone: string): KickoffAt {
    const date = dateLabel(fixtureDay(fixture, zone));
    if (!fixture.timeConfirmed) return { date, time: null, zone: null };
    return { date, time: timeIn(zone, fixture.kickoff), zone: zoneName(zone, fixture.kickoff) };
}

function searchText(fixture: Fixture, competition: Competition): string {
    const { home, away, venue } = fixture;
    return [
        home?.name,
        home?.shortName,
        away?.name,
        away?.shortName,
        venue?.name,
        venue?.city,
        venue?.country,
        competition.name,
        competition.short,
    ]
        .join(' ')
        .toLowerCase();
}

function insideArea(fixture: Fixture, area: Area | null): boolean {
    if (!area) return true;
    const lat = fixture.venue?.lat;
    const lng = fixture.venue?.lng;
    if (lat == null || lng == null) return false;
    return lat >= area.south && lat <= area.north && lng >= area.west && lng <= area.east;
}

function matchesSearch(text: string, search: string): boolean {
    const words = search.toLowerCase().split(/\s+/).filter(Boolean);
    return words.every(word => text.includes(word));
}

export function viewFixtures(
    fixtures: Fixture[],
    competitions: Competition[],
    filters: Filters,
    context: ViewContext,
): FixturesView {
    const chosen = filters.comps === 'all' ? competitions : competitions.filter(c => filters.comps.includes(c.slug));
    const bySlug = new Map(chosen.map(c => [c.slug, c]));
    const views: FixtureView[] = [];
    for (const fixture of fixtures) {
        const competition = bySlug.get(fixture.comp);
        if (!competition) continue;
        const zoneAtVenue = venueZone(fixture.venue?.country ?? null, fixture.venue?.lng ?? null);
        const day = fixtureDay(fixture, zoneAtVenue);
        if (day < filters.range.from || day > filters.range.to) continue;
        if (!matchesSearch(searchText(fixture, competition), filters.search)) continue;
        if (!insideArea(fixture, filters.area)) continue;
        const shownZone = filters.timeZone === 'mine' ? context.myZone : zoneAtVenue;
        views.push({
            ...fixture,
            competition,
            day: fixtureDay(fixture, shownZone),
            kickoffAt: kickoffAt(fixture, shownZone),
            tbc: tbcGuidance(fixture, competition, day, context.today),
            approximate: fixture.venue?.precision === 'city',
        });
    }
    views.sort((a, b) => a.kickoff.localeCompare(b.kickoff));
    const days = countDays(views);
    const day = days.some(d => d.day === filters.day) ? filters.day : null;
    return { days, fixtures: day ? views.filter(v => v.day === day) : views };
}
