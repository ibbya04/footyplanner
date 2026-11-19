import type { Fixture } from '@footyplanner/shared';
import { z } from 'zod';

const KEY = 'fp:shortlist';

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;

const text = z.string().nullable();

const team = z.object({
    id: z.string(),
    name: z.string(),
    shortName: text,
    abbreviation: text,
    crest: text,
});

const storedFixture = z.object({
    id: z.string(),
    comp: z.string(),
    kickoff: z.string(),
    timeConfirmed: z.boolean(),
    status: z.object({ state: z.enum(['pre', 'in', 'post']), name: z.string(), detail: text }),
    home: team.nullable(),
    away: team.nullable(),
    score: z.object({ home: z.number().nullable(), away: z.number().nullable() }).nullable(),
    venue: z
        .object({
            name: z.string(),
            city: text,
            country: text,
            lat: z.number().nullable(),
            lng: z.number().nullable(),
            precision: z.enum(['stadium', 'city']).nullable(),
        })
        .nullable(),
    neutral: z.boolean(),
    url: text,
}) satisfies z.ZodType<Fixture>;

function parse(raw: string): unknown {
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function stored(storage: Storage): string | null {
    try {
        return storage.getItem(KEY);
    } catch {
        return null;
    }
}

export function readShortlist(storage: Storage): Fixture[] {
    const raw = stored(storage);
    const entries = raw ? parse(raw) : null;
    if (!Array.isArray(entries)) return [];
    return entries.flatMap(entry => {
        const result = storedFixture.safeParse(entry);
        return result.success ? [result.data] : [];
    });
}

export function writeShortlist(storage: Storage, fixtures: Fixture[]): void {
    try {
        storage.setItem(KEY, JSON.stringify(fixtures));
    } catch {
        return;
    }
}

export function toggleSaved(saved: Fixture[], fixture: Fixture): Fixture[] {
    return saved.some(f => f.id === fixture.id) ? saved.filter(f => f.id !== fixture.id) : [...saved, fixture];
}

export function refreshSaved(saved: Fixture[], fresh: Fixture[]): Fixture[] {
    const byId = new Map(fresh.map(f => [f.id, f]));
    let changed = false;
    const refreshed = saved.map(old => {
        const next = byId.get(old.id);
        if (!next || JSON.stringify(next) === JSON.stringify(old)) return old;
        changed = true;
        return next;
    });
    return changed ? refreshed : saved;
}
