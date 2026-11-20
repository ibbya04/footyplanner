import type { Fixture, TeamRef } from '@footyplanner/shared';
import { and, asc, eq, isNull, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import type { Db } from './index';
import { fixtures, teams, venueOverrides, venues } from './schema';

const home = alias(teams, 'home');
const away = alias(teams, 'away');

const crest = (key: string | null, url: string | null) => (key ? `/img/${key}` : url);

function team(
    t: {
        id: string | null;
        name: string | null;
        shortName: string | null;
        abbreviation: string | null;
        crestKey: string | null;
        crestUrl: string | null;
    } | null,
): TeamRef | null {
    if (!t?.id || !t.name) return null;
    return {
        id: t.id,
        name: t.name,
        shortName: t.shortName,
        abbreviation: t.abbreviation,
        crest: crest(t.crestKey, t.crestUrl),
    };
}

const teamColumns = (t: typeof home | typeof away) => ({
    id: t.id,
    name: t.name,
    shortName: t.shortName,
    abbreviation: t.abbreviation,
    crestKey: t.crestKey,
    crestUrl: t.crestUrl,
});

export async function listFixtures(db: Db, where: SQL | undefined): Promise<Fixture[]> {
    const rows = await db
        .select({
            f: fixtures,
            home: teamColumns(home),
            away: teamColumns(away),
            venue: {
                name: venues.name,
                city: venues.city,
                country: venues.country,
                lat: venues.lat,
                lng: venues.lng,
                precision: venues.precision,
            },
            override: { lat: venueOverrides.lat, lng: venueOverrides.lng, precision: venueOverrides.precision },
        })
        .from(fixtures)
        .leftJoin(home, eq(home.id, fixtures.homeTeamId))
        .leftJoin(away, eq(away.id, fixtures.awayTeamId))
        .leftJoin(venues, eq(venues.key, fixtures.venueKey))
        .leftJoin(venueOverrides, eq(venueOverrides.key, fixtures.venueKey))
        .where(and(where, isNull(fixtures.removedAt)))
        .orderBy(asc(fixtures.kickoff), asc(fixtures.id));

    return rows.map(({ f, home, away, venue, override }) => ({
        id: f.id,
        comp: f.comp,
        kickoff: f.kickoff,
        timeConfirmed: f.timeValid,
        status: { state: f.state as Fixture['status']['state'], name: f.statusName, detail: f.statusDetail },
        home: team(home),
        away: team(away),
        score: f.state === 'pre' ? null : { home: f.homeScore, away: f.awayScore },
        venue: venue?.name
            ? {
                  name: venue.name,
                  city: venue.city,
                  country: venue.country,
                  lat: override?.lat ?? venue.lat,
                  lng: override?.lng ?? venue.lng,
                  precision: override?.precision ?? venue.precision,
              }
            : null,
        neutral: f.neutralSite,
        url: f.summaryUrl,
    }));
}
