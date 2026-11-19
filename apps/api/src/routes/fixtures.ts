import { zValidator } from '@hono/zod-validator';
import type { Fixture, FixturesResponse, TeamRef } from '@footyplanner/shared';
import { and, asc, eq, gte, inArray, isNull, lt } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import { Hono } from 'hono';
import { z } from 'zod';
import { cacheFor } from '../cache';
import { getDb } from '../db';
import { competitions, fixtures, teams, venueOverrides, venues } from '../db/schema';
import { badRequest, compList, isoDate } from './validation';

export const MAX_RANGE_DAYS = 62;
const DAY = 86_400_000;

const query = z
    .object({
        from: isoDate('from must be YYYY-MM-DD'),
        to: isoDate('to must be YYYY-MM-DD'),
        comps: compList.optional(),
    })
    .refine(q => q.to >= q.from, 'to must not be before from')
    .refine(
        q => (Date.parse(q.to) - Date.parse(q.from)) / DAY < MAX_RANGE_DAYS,
        `the range can be at most ${MAX_RANGE_DAYS} days`,
    );

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

function cacheHeaders(from: string, to: string, now: number) {
    const today = new Date(now).toISOString().slice(0, 10);
    const yesterday = new Date(now - DAY).toISOString().slice(0, 10);
    const tomorrow = new Date(now + DAY).toISOString().slice(0, 10);
    if (from <= tomorrow && to >= yesterday) return cacheFor(60, 300);
    if (to < today) return cacheFor(86400);
    return cacheFor(3600);
}

export const fixturesRoute = new Hono<{ Bindings: Env }>().get('/', zValidator('query', query, badRequest), async c => {
    const { from, to, comps } = c.req.valid('query');
    const db = getDb(c.env.DB);
    const chosen =
        comps ?? db.select({ slug: competitions.slug }).from(competitions).where(eq(competitions.active, true));
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
        .where(
            and(
                inArray(fixtures.comp, chosen),
                gte(fixtures.kickoff, `${from}T00:00:00.000Z`),
                lt(fixtures.kickoff, new Date(Date.parse(to) + DAY).toISOString()),
                isNull(fixtures.removedAt),
            ),
        )
        .orderBy(asc(fixtures.kickoff), asc(fixtures.id));

    const list: Fixture[] = rows.map(({ f, home, away, venue, override }) => ({
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

    const body: FixturesResponse = { from, to, fixtures: list };
    return c.json(body, 200, cacheHeaders(from, to, Date.now()));
});
