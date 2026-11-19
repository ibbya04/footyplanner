import {
    buildIcs,
    type CalendarFixture,
    type Fixture,
    fixtureTitle,
    type TripResponse,
    venueText,
} from '@footyplanner/shared';
import { inArray } from 'drizzle-orm';
import type { Db } from '../db';
import { competitions } from '../db/schema';

const DEFAULT_NAME = 'footyplanner trip';
const REFRESH_HOURS = 1;

const espnDay = (fixture: Fixture) => fixture.kickoff.slice(0, 10);

async function competitionNames(db: Db, fixtures: Fixture[]): Promise<Map<string, string>> {
    const slugs = [...new Set(fixtures.map(f => f.comp))];
    if (!slugs.length) return new Map();
    const rows = await db
        .select({ slug: competitions.slug, name: competitions.name })
        .from(competitions)
        .where(inArray(competitions.slug, slugs));
    return new Map(rows.map(r => [r.slug, r.name]));
}

export async function tripCalendar(db: Db, trip: TripResponse, now: Date): Promise<string> {
    const names = await competitionNames(db, trip.fixtures);
    const events: CalendarFixture[] = trip.fixtures.map(fixture => ({
        ...fixture,
        day: espnDay(fixture),
        title: fixtureTitle(fixture),
        competition: { name: names.get(fixture.comp) ?? fixture.comp },
        venueText: venueText(fixture),
    }));
    return buildIcs(events, now, { name: trip.name ?? DEFAULT_NAME, refreshHours: REFRESH_HOURS });
}
