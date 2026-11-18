// GET /api/day?date=YYYY-MM-DD&comps=eng.1,esp.1,...
// All requested competitions' fixtures for one day in a single, edge-cached response.
// Temporary: the legacy page still uses it. Removed in step 3, when the React app reads /api/fixtures.
import { zValidator } from '@hono/zod-validator';
import { leagueLogo, slimEvent, type EspnEvent, type EspnScoreboard } from '@footyplanner/shared';
import { Hono } from 'hono';
import { z } from 'zod';
import { cacheFor, NO_STORE } from '../cache';
import { getJson } from '../upstream';
import { badRequest, compList, isoDate } from './validation';

const query = z.object({ date: isoDate('date must be YYYY-MM-DD'), comps: compList });

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

export const day = new Hono<{ Bindings: Env }>().get('/', zValidator('query', query, badRequest), async c => {
    const { date, comps } = c.req.valid('query');
    const espnDate = date.replaceAll('-', '');
    const competitions: Record<string, DayCompetition> = {};
    const failed: string[] = [];
    await Promise.all(
        comps.map(async slug => {
            try {
                const data = await getJson<EspnScoreboard>(`${c.env.ESPN_BASE}/${slug}/scoreboard?dates=${espnDate}`);
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
});
