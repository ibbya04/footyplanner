import { zValidator } from '@hono/zod-validator';
import type { FixturesResponse } from '@footyplanner/shared';
import { and, eq, gte, inArray, lt } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { cacheFor } from '../cache';
import { getDb } from '../db';
import { listFixtures } from '../db/fixtures';
import { competitions, fixtures } from '../db/schema';
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
    const list = await listFixtures(
        db,
        and(
            inArray(fixtures.comp, chosen),
            gte(fixtures.kickoff, `${from}T00:00:00.000Z`),
            lt(fixtures.kickoff, new Date(Date.parse(to) + DAY).toISOString()),
        ),
    );

    const body: FixturesResponse = { from, to, fixtures: list };
    return c.json(body, 200, cacheHeaders(from, to, Date.now()));
});
