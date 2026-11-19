import {
    type Competition,
    distanceKm,
    distLabel,
    type Fixture,
    FLY_KM,
    formatMinutes,
    travelLabel,
    travelMinutes,
} from '@footyplanner/shared';
import type { DateRange } from '../dates';
import { type TbcGuidance, tbcGuidance } from './tbc';
import { dateLabel, dayIn, timeIn, venueZone, zoneName } from './timeZones';

export interface Area {
    south: number;
    west: number;
    north: number;
    east: number;
}

export interface Near {
    name: string;
    lat: number;
    lng: number;
    radius: number;
}

export type SortBy = 'time' | 'distance';

export interface Filters {
    range: DateRange;
    comps: 'all' | string[];
    day: string | null;
    search: string;
    timeZone: 'venue' | 'mine';
    area: Area | null;
    near: Near | null;
    sort: SortBy;
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
    kickoffText: string;
    title: string;
    venueText: string | null;
    tbc: TbcGuidance | null;
    approximate: boolean;
    distanceKm: number | null;
    distanceText: string | null;
    travelText: string | null;
    directionsUrl: string | null;
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

function kickoffText(fixture: Fixture, at: KickoffAt, zone: string, myZone: string): string {
    if (!at.time) return `${at.date} · time TBC`;
    const yours = timeIn(myZone, fixture.kickoff);
    const hint = zone !== myZone && yours !== at.time ? ` (${yours} yours)` : '';
    return `${at.date} · ${at.time} ${at.zone}${hint}`;
}

const teamName = (team: Fixture['home']) => team?.shortName ?? team?.name ?? 'TBD';

function venueText(fixture: Fixture): string | null {
    const { venue } = fixture;
    return venue ? [venue.name, venue.city].filter(Boolean).join(', ') : null;
}

function directionsUrl(fixture: Fixture): string | null {
    const { venue } = fixture;
    if (venue?.lat == null || venue.lng == null) return null;
    const query = [venue.name, venue.city].filter(Boolean).join(' ');
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
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

function distanceFrom(fixture: Fixture, near: Near | null): number | null {
    const lat = fixture.venue?.lat;
    const lng = fixture.venue?.lng;
    if (!near || lat == null || lng == null) return null;
    return distanceKm(near, { lat, lng });
}

function distanceText(km: number | null): string | null {
    if (km === null) return null;
    return `${distLabel(km)} · ≈${formatMinutes(travelMinutes(km))}${km > FLY_KM ? ' by air' : ''}`;
}

function travelText(km: number | null, near: Near | null): string | null {
    return km === null || !near ? null : `${travelLabel(km)} from ${near.name}`;
}

function withinReach(distance: number | null, near: Near | null): boolean {
    return !near || (distance !== null && distance <= near.radius);
}

function byKickoff(a: FixtureView, b: FixtureView): number {
    return a.kickoff.localeCompare(b.kickoff) || a.competition.short.localeCompare(b.competition.short);
}

function byDistance(a: FixtureView, b: FixtureView): number {
    return (a.distanceKm ?? 0) - (b.distanceKm ?? 0) || byKickoff(a, b);
}

function matchesSearch(text: string, search: string): boolean {
    const words = search.toLowerCase().split(/\s+/).filter(Boolean);
    return words.every(word => text.includes(word));
}

type ViewOptions = Pick<Filters, 'timeZone' | 'near'>;

function viewFixture(
    fixture: Fixture,
    competition: Competition,
    filters: ViewOptions,
    context: ViewContext,
): FixtureView {
    const zoneAtVenue = venueZone(fixture.venue?.country ?? null, fixture.venue?.lng ?? null);
    const shownZone = filters.timeZone === 'mine' ? context.myZone : zoneAtVenue;
    const at = kickoffAt(fixture, shownZone);
    const distance = distanceFrom(fixture, filters.near);
    return {
        ...fixture,
        competition,
        day: fixtureDay(fixture, shownZone),
        kickoffAt: at,
        kickoffText: kickoffText(fixture, at, shownZone, context.myZone),
        title: `${teamName(fixture.home)} v ${teamName(fixture.away)}`,
        venueText: venueText(fixture),
        tbc: tbcGuidance(fixture, competition, fixtureDay(fixture, zoneAtVenue), context.today),
        approximate: fixture.venue?.precision === 'city',
        distanceKm: distance,
        distanceText: distanceText(distance),
        travelText: travelText(distance, filters.near),
        directionsUrl: directionsUrl(fixture),
    };
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
        const view = viewFixture(fixture, competition, filters, context);
        if (!withinReach(view.distanceKm, filters.near)) continue;
        views.push(view);
    }
    views.sort(filters.near && filters.sort === 'distance' ? byDistance : byKickoff);
    const days = countDays(views);
    const day = days.some(d => d.day === filters.day) ? filters.day : null;
    return { days, fixtures: day ? views.filter(v => v.day === day) : views };
}

export function viewShortlist(
    saved: Fixture[],
    competitions: Competition[],
    filters: ViewOptions,
    context: ViewContext,
): FixtureView[] {
    const bySlug = new Map(competitions.map(c => [c.slug, c]));
    return saved
        .flatMap(fixture => {
            const competition = bySlug.get(fixture.comp);
            return competition ? [viewFixture(fixture, competition, filters, context)] : [];
        })
        .sort(byKickoff);
}
