import type { CompetitionsResponse } from '@footyplanner/shared';
import { asc, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { cacheFor } from '../cache';
import { getDb } from '../db';
import { competitions } from '../db/schema';

export const competitionsRoute = new Hono<{ Bindings: Env }>().get('/', async c => {
    const rows = await getDb(c.env.DB)
        .select()
        .from(competitions)
        .where(eq(competitions.active, true))
        .orderBy(asc(competitions.sortOrder));
    const body: CompetitionsResponse = {
        competitions: rows.map(r => ({
            slug: r.slug,
            name: r.name,
            short: r.short,
            group: { key: r.groupKey, name: r.groupName, color: r.color },
            featured: r.featured,
            tbc: { weeks: r.tbcWeeks, text: r.tbcText, tv: r.tbcTv },
            logo: r.logoKey ? `/img/${r.logoKey}` : r.logoUrl,
        })),
    };
    return c.json(body, 200, cacheFor(3600));
});
