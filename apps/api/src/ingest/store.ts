import { and, eq, gte, isNull, lt, sql } from 'drizzle-orm';
import type { BatchItem } from 'drizzle-orm/batch';
import type { Db } from '../db';
import { fixtureChanges, fixtures, teams, venues } from '../db/schema';
import { diffFixtures, type StoredFixture } from './diff';
import type { ParsedEvent } from './parse';

export type Statement = BatchItem<'sqlite'>;

export async function runBatch(db: Db, statements: Statement[]): Promise<void> {
    const [first, ...rest] = statements;
    if (first) await db.batch([first, ...rest]);
}

const inJson = (column: typeof fixtures.id, ids: string[]) =>
    sql`${column} IN (SELECT value FROM json_each(${JSON.stringify(ids)}))`;

async function loadStored(db: Db, ids: string[]): Promise<Map<string, StoredFixture>> {
    if (!ids.length) return new Map();
    const rows = await db.select().from(fixtures).where(inJson(fixtures.id, ids));
    return new Map(rows.map(r => [r.id, r]));
}

function teamUpserts(db: Db, parsed: ParsedEvent[]): Statement[] {
    const unique = new Map(parsed.flatMap(p => p.teams).map(t => [t.id, t]));
    return [...unique.values()].map(t =>
        db
            .insert(teams)
            .values(t)
            .onConflictDoUpdate({
                target: teams.id,
                set: {
                    name: sql`excluded.name`,
                    shortName: sql`excluded.short_name`,
                    abbreviation: sql`excluded.abbreviation`,
                    crestUrl: sql`excluded.crest_url`,
                    crestKey: sql`CASE WHEN ${teams.crestUrl} IS excluded.crest_url THEN ${teams.crestKey} ELSE NULL END`,
                },
                setWhere: sql`${teams.name} IS NOT excluded.name OR ${teams.shortName} IS NOT excluded.short_name
                    OR ${teams.abbreviation} IS NOT excluded.abbreviation OR ${teams.crestUrl} IS NOT excluded.crest_url`,
            }),
    );
}

function venueUpserts(db: Db, parsed: ParsedEvent[], now: number): Statement[] {
    const unique = new Map(parsed.flatMap(p => (p.venue ? [p.venue] : [])).map(v => [v.key, v]));
    return [...unique.values()].map(v =>
        db
            .insert(venues)
            .values({ ...v, geocodeAttempts: 0, nextGeocodeAt: now })
            .onConflictDoUpdate({
                target: venues.key,
                set: {
                    espnId: sql`excluded.espn_id`,
                    name: sql`excluded.name`,
                    city: sql`excluded.city`,
                    country: sql`excluded.country`,
                },
                setWhere: sql`${venues.espnId} IS NOT excluded.espn_id OR ${venues.name} IS NOT excluded.name`,
            }),
    );
}

export interface ApplyResult {
    statements: Statement[];
    fixturesWritten: number;
    changes: number;
}

export async function prepareWrites(
    db: Db,
    comp: string,
    parsed: ParsedEvent[],
    window: { from: string; to: string },
    now: number,
): Promise<ApplyResult> {
    const incoming = parsed.map(p => p.fixture);
    const ids = incoming.map(f => f.id);
    const { writes, changes } = diffFixtures(await loadStored(db, ids), incoming);

    const statements: Statement[] = [...teamUpserts(db, parsed), ...venueUpserts(db, parsed, now)];
    for (const f of writes) {
        statements.push(
            db
                .insert(fixtures)
                .values({ ...f, removedAt: null, updatedAt: now })
                .onConflictDoUpdate({
                    target: fixtures.id,
                    set: {
                        comp: sql`excluded.comp`,
                        kickoff: sql`excluded.kickoff`,
                        timeValid: sql`excluded.time_valid`,
                        state: sql`excluded.state`,
                        statusName: sql`excluded.status_name`,
                        statusDetail: sql`excluded.status_detail`,
                        homeTeamId: sql`excluded.home_team_id`,
                        awayTeamId: sql`excluded.away_team_id`,
                        homeScore: sql`excluded.home_score`,
                        awayScore: sql`excluded.away_score`,
                        venueKey: sql`excluded.venue_key`,
                        neutralSite: sql`excluded.neutral_site`,
                        summaryUrl: sql`excluded.summary_url`,
                        removedAt: null,
                        updatedAt: now,
                    },
                }),
        );
    }
    for (const c of changes) statements.push(db.insert(fixtureChanges).values({ ...c, at: now }));

    if (ids.length) {
        statements.push(
            db
                .update(fixtures)
                .set({ removedAt: now, updatedAt: now })
                .where(
                    and(
                        eq(fixtures.comp, comp),
                        gte(fixtures.kickoff, window.from),
                        lt(fixtures.kickoff, window.to),
                        isNull(fixtures.removedAt),
                        sql`NOT ${inJson(fixtures.id, ids)}`,
                    ),
                ),
        );
    }
    return { statements, fixturesWritten: writes.length, changes: changes.length };
}
