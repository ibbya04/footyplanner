import { zValidator } from '@hono/zod-validator';
import type { TripCreated } from '@footyplanner/shared';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { NO_STORE } from '../cache';
import { type Db, getDb } from '../db';
import { fixtures, trips } from '../db/schema';
import { rateLimit } from '../rateLimit';
import { findTrip, loadTrip } from '../trips/load';
import { hashToken, newEditToken, newTripId, tokenMatches } from '../trips/tokens';
import { badRequest } from './validation';

export const MAX_TRIP_FIXTURES = 50;
const MAX_NAME_LENGTH = 60;

const fixtureId = z.string().regex(/^[a-z0-9_.]{2,40}:[\w-]{1,30}$/, 'fixtureIds must be fixture ids');

const tripBody = z.object({
    name: z
        .string()
        .trim()
        .max(MAX_NAME_LENGTH, `name can be at most ${MAX_NAME_LENGTH} characters`)
        .transform(name => name || null)
        .nullish(),
    fixtureIds: z
        .array(fixtureId)
        .min(1, 'a trip needs at least one fixture')
        .max(MAX_TRIP_FIXTURES, `a trip can have at most ${MAX_TRIP_FIXTURES} fixtures`)
        .refine(ids => new Set(ids).size === ids.length, 'fixtureIds must not repeat'),
});

async function allListed(db: Db, ids: string[]): Promise<boolean> {
    const found = await db
        .select({ id: fixtures.id })
        .from(fixtures)
        .where(and(inArray(fixtures.id, ids), isNull(fixtures.removedAt)));
    return found.length === ids.length;
}

const unknownFixtures = { error: 'fixtureIds must all be listed fixtures' };
const notFound = { error: 'not found' };

function bearerToken(header: string | undefined): string | null {
    const match = /^Bearer ([A-Za-z0-9_-]+)$/.exec(header ?? '');
    return match?.[1] ?? null;
}

export const tripsRoute = new Hono<{ Bindings: Env }>()
    .post(
        '/',
        rateLimit(env => env.TRIP_LIMITER),
        zValidator('json', tripBody, badRequest),
        async c => {
            const { name, fixtureIds } = c.req.valid('json');
            const db = getDb(c.env.DB);
            if (!(await allListed(db, fixtureIds))) return c.json(unknownFixtures, 400, NO_STORE);

            const created: TripCreated = { id: newTripId(), editToken: newEditToken() };
            const now = Date.now();
            await db.insert(trips).values({
                id: created.id,
                editTokenHash: await hashToken(created.editToken),
                name: name ?? null,
                fixtureIds,
                createdAt: now,
                updatedAt: now,
            });
            return c.json(created, 201, NO_STORE);
        },
    )
    .get('/:id', async c => {
        const trip = await loadTrip(getDb(c.env.DB), c.req.param('id'));
        if (!trip) return c.json(notFound, 404, NO_STORE);
        return c.json(trip, 200, NO_STORE);
    })
    .put('/:id', zValidator('json', tripBody, badRequest), async c => {
        const id = c.req.param('id');
        const db = getDb(c.env.DB);
        const stored = await findTrip(db, id);
        if (!stored) return c.json(notFound, 404, NO_STORE);
        const token = bearerToken(c.req.header('Authorization'));
        if (!token || !(await tokenMatches(token, stored.editTokenHash))) {
            return c.json({ error: 'edit token required' }, 401, NO_STORE);
        }

        const { name, fixtureIds } = c.req.valid('json');
        if (!(await allListed(db, fixtureIds))) return c.json(unknownFixtures, 400, NO_STORE);
        await db
            .update(trips)
            .set({ name: name ?? null, fixtureIds, updatedAt: Date.now() })
            .where(eq(trips.id, id));
        return c.json(await loadTrip(db, id), 200, NO_STORE);
    });
