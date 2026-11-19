import type { MiddlewareHandler } from 'hono';
import { NO_STORE } from './cache';

export function rateLimit(limiter: (env: Env) => RateLimit | undefined): MiddlewareHandler<{ Bindings: Env }> {
    return async (c, next) => {
        const ip = c.req.header('CF-Connecting-IP');
        const chosen = limiter(c.env);
        if (ip && chosen) {
            const { success } = await chosen.limit({ key: ip });
            if (!success) return c.json({ error: 'too many requests' }, 429, { ...NO_STORE, 'Retry-After': '60' });
        }
        await next();
    };
}
