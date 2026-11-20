import type { TripResponse } from '@footyplanner/shared';
import { eq, inArray } from 'drizzle-orm';
import type { Db } from '../db';
import { listFixtures } from '../db/fixtures';
import { fixtures, trips } from '../db/schema';

export const TRIP_ID = /^[A-Za-z0-9_-]{10}$/;

export async function findTrip(db: Db, id: string) {
    if (!TRIP_ID.test(id)) return undefined;
    return db.select().from(trips).where(eq(trips.id, id)).get();
}

export async function loadTrip(db: Db, id: string): Promise<TripResponse | null> {
    const trip = await findTrip(db, id);
    if (!trip) return null;
    const listed = await listFixtures(db, inArray(fixtures.id, trip.fixtureIds));
    const found = new Set(listed.map(f => f.id));
    return {
        id,
        name: trip.name,
        fixtures: listed,
        missing: trip.fixtureIds.filter(fixtureId => !found.has(fixtureId)),
        updatedAt: new Date(trip.updatedAt).toISOString(),
    };
}
