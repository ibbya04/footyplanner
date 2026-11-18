import type { StatusResponse } from '@footyplanner/shared';
import { and, count, desc, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { cacheFor } from '../cache';
import { getDb } from '../db';
import { competitions, ingestQueue, ingestRuns, teams, venueOverrides, venues } from '../db/schema';

const iso = (ms: number | null) => (ms === null ? null : new Date(ms).toISOString());

export const statusRoute = new Hono<{ Bindings: Env }>().get('/', async c => {
    const db = getDb(c.env.DB);
    const [[lastRun], perComp, [pendingVenues], [pendingCrests]] = await db.batch([
        db.select().from(ingestRuns).orderBy(desc(ingestRuns.startedAt)).limit(1),
        db
            .select({
                slug: ingestQueue.comp,
                months: count(),
                monthsFetched: count(ingestQueue.lastOkAt),
                lastOkAt: sql<number | null>`max(${ingestQueue.lastOkAt})`,
                failingMonths: sql<number>`sum(${ingestQueue.failures} > 0)`,
                lastError: sql<string | null>`max(${ingestQueue.lastError})`,
            })
            .from(ingestQueue)
            .innerJoin(competitions, and(eq(competitions.slug, ingestQueue.comp), eq(competitions.active, true)))
            .groupBy(ingestQueue.comp)
            .orderBy(competitions.sortOrder),
        db
            .select({ n: count() })
            .from(venues)
            .leftJoin(venueOverrides, eq(venueOverrides.key, venues.key))
            .where(and(isNull(venues.lat), isNull(venueOverrides.key))),
        db
            .select({ n: count() })
            .from(teams)
            .where(and(isNull(teams.crestKey), isNotNull(teams.crestUrl))),
    ]);

    const body: StatusResponse = {
        now: new Date().toISOString(),
        lastRun: lastRun
            ? {
                  startedAt: iso(lastRun.startedAt)!,
                  finishedAt: iso(lastRun.finishedAt)!,
                  mode: lastRun.mode,
                  espnCalls: lastRun.espnCalls,
                  fixturesWritten: lastRun.fixturesWritten,
                  errors: lastRun.errors ?? [],
              }
            : null,
        competitions: perComp.map(r => ({ ...r, lastOkAt: iso(r.lastOkAt), failingMonths: Number(r.failingMonths) })),
        pending: { venues: pendingVenues?.n ?? 0, crests: pendingCrests?.n ?? 0 },
    };
    return c.json(body, 200, cacheFor(30, 60));
});
