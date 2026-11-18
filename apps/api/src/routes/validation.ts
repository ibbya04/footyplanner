import type { Context } from 'hono';
import { z } from 'zod';
import { NO_STORE } from '../cache';

export const MAX_COMPS = 40; // stays under the Free plan's 50 subrequests (and D1's 100 bound parameters)

export const COMPS_ERROR = `comps must be 1-${MAX_COMPS} ESPN league slugs`;

export const isoDate = (error: string) =>
    z
        .string({ error })
        .regex(/^\d{4}-\d{2}-\d{2}$/, error)
        .refine(d => !isNaN(Date.parse(d)), error);

// "esp.1,eng.1,eng.1" → ["eng.1", "esp.1"]. Sorted so equivalent requests share a cache entry's data.
export const compList = z
    .string({ error: COMPS_ERROR })
    .transform(s => [...new Set(s.split(',').filter(Boolean))].sort())
    .pipe(
        z
            .array(z.string().regex(/^[a-z0-9_.]{2,40}$/, COMPS_ERROR))
            .min(1, COMPS_ERROR)
            .max(MAX_COMPS, COMPS_ERROR),
    );

// zValidator hook: a 400 with the first problem, never cached.
export function badRequest(result: { success: boolean; error?: { issues: { message: string }[] } }, c: Context) {
    if (!result.success) return c.json({ error: result.error?.issues[0]?.message ?? 'bad request' }, 400, NO_STORE);
}
