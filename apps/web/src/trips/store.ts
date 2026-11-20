import { z } from 'zod';

const KEY = 'fp:trip';

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem' | 'removeItem'>;

const tripLink = z.object({
    id: z.string().regex(/^[A-Za-z0-9_-]{10}$/),
    editToken: z.string().regex(/^[A-Za-z0-9_-]+$/),
    name: z.string().nullable(),
    savedIds: z.array(z.string()),
});

export type TripLink = z.infer<typeof tripLink>;

export interface TripBody {
    name: string | null;
    fixtureIds: string[];
}

function parse(raw: string): unknown {
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

export function readTripLink(storage: Storage): TripLink | null {
    try {
        const raw = storage.getItem(KEY);
        const result = tripLink.safeParse(raw ? parse(raw) : null);
        return result.success ? result.data : null;
    } catch {
        return null;
    }
}

export function writeTripLink(storage: Storage, link: TripLink): void {
    try {
        storage.setItem(KEY, JSON.stringify(link));
    } catch {
        return;
    }
}

export function forgetTripLink(storage: Storage): void {
    try {
        storage.removeItem(KEY);
    } catch {
        return;
    }
}

const sameIds = (a: string[], b: string[]) => a.length === b.length && a.every((id, i) => id === b[i]);

export function pendingSave(link: TripLink, name: string | null, fixtureIds: string[]): TripBody | null {
    if (!fixtureIds.length) return null;
    if (name === link.name && sameIds(fixtureIds, link.savedIds)) return null;
    return { name, fixtureIds };
}
