import { and, asc, eq, isNull, lte } from 'drizzle-orm';
import type { Db } from '../db';
import { venueOverrides, venues } from '../db/schema';
import { geocodeVenue } from '../geocode';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export async function geocodeNext(db: Db, photonUrl: string, now: number): Promise<string | null> {
    const [next] = await db
        .select({
            key: venues.key,
            name: venues.name,
            city: venues.city,
            country: venues.country,
            attempts: venues.geocodeAttempts,
        })
        .from(venues)
        .leftJoin(venueOverrides, eq(venueOverrides.key, venues.key))
        .where(and(isNull(venues.lat), lte(venues.nextGeocodeAt, now), isNull(venueOverrides.key)))
        .orderBy(asc(venues.nextGeocodeAt))
        .limit(1);
    if (!next) return null;

    const attempts = next.attempts + 1;
    try {
        const loc = await geocodeVenue(photonUrl, {
            name: next.name,
            city: next.city ?? '',
            country: next.country ?? '',
        });
        await db
            .update(venues)
            .set(
                loc
                    ? { ...loc, source: 'photon', geocodeAttempts: attempts, nextGeocodeAt: null }
                    : { geocodeAttempts: attempts, nextGeocodeAt: now + Math.min(7 * attempts, 30) * DAY },
            )
            .where(eq(venues.key, next.key));
        return null;
    } catch (err) {
        await db
            .update(venues)
            .set({ nextGeocodeAt: now + HOUR })
            .where(eq(venues.key, next.key));
        return `geocode ${next.key}: ${(err as Error).message}`;
    }
}
