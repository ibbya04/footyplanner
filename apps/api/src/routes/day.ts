// GET /api/day?date=YYYY-MM-DD&comps=eng.1,esp.1,...
// All requested competitions' fixtures for one day in a single, edge-cached response.
// Temporary: replaced by /api/fixtures (read from D1) in step 2.
import { zValidator } from '@hono/zod-validator';
import { leagueLogo, slimEvent, type EspnEvent, type EspnScoreboard } from '@footyplanner/shared';
import { Hono } from 'hono';
import { z } from 'zod';
import { cacheFor, NO_STORE } from '../cache';
import { getJson } from '../upstream';

export const MAX_COMPS = 40; // stays under the Free plan's 50 subrequests per request

const DATE_ERROR = 'date must be YYYY-MM-DD';
const COMPS_ERROR = `comps must be 1-${MAX_COMPS} ESPN league slugs`;

const query = z.object({
    date: z
        .string({ error: DATE_ERROR })
        .regex(/^\d{4}-\d{2}-\d{2}$/, DATE_ERROR)
        .refine(d => !isNaN(Date.parse(d)), DATE_ERROR),
    comps: z
        .string({ error: COMPS_ERROR })
        .transform(s => [...new Set(s.split(',').filter(Boolean))].sort())
        .pipe(
            z
                .array(z.string().regex(/^[a-z0-9_.]{2,40}$/, COMPS_ERROR))
                .min(1, COMPS_ERROR)
                .max(MAX_COMPS, COMPS_ERROR),
        ),
});

function todayUtc(): string {
    return new Date().toISOString().slice(0, 10);
}
function daysBetween(a: string, b: string): number {
    return Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
}

interface DayCompetition {
    logo: string | null;
    events: EspnEvent[];
}

export const day = new Hono<{ Bindings: Env }>().get(
    '/',
    zValidator('query', query, (result, c) => {
        if (!result.success) return c.json({ error: result.error.issues[0]?.message ?? 'bad request' }, 400, NO_STORE);
    }),
    async c => {
        const { date, comps } = c.req.valid('query');
        const espnDate = date.replaceAll('-', '');
        const competitions: Record<string, DayCompetition> = {};
        const failed: string[] = [];
        await Promise.all(
            comps.map(async slug => {
                try {
                    const data = await getJson<EspnScoreboard>(
                        `${c.env.ESPN_BASE}/${slug}/scoreboard?dates=${espnDate}`,
                    );
                    competitions[slug] = {
                        logo: leagueLogo(data.leagues),
                        events: (Array.isArray(data.events) ? data.events : []).map(slimEvent),
                    };
                } catch {
                    failed.push(slug);
                }
            }),
        );

        if (!Object.keys(competitions).length) {
            return c.json({ error: 'ESPN unavailable', failed }, 502, NO_STORE);
        }

        // Finished days barely change; days around today carry live scores; future days change occasionally.
        const age = daysBetween(date, todayUtc()); // positive = past
        const headers = failed.length
            ? cacheFor(60)
            : age > 1
              ? cacheFor(7 * 86400)
              : age >= -1
                ? cacheFor(120, 600)
                : cacheFor(3 * 3600);
        return c.json({ date, competitions, failed: failed.sort() }, 200, headers);
    },
);
