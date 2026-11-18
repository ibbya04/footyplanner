// GET /img/teams/359.png, /img/leagues/eng.1.png: crests and logos copied into R2 by the cron.
import { Hono } from 'hono';
import { cacheFor, NO_STORE } from '../cache';

const KEY = /^(teams|leagues)\/[a-z0-9_.-]+\.(png|jpg|svg|webp|gif)$/;

export const imagesRoute = new Hono<{ Bindings: Env }>().get('/*', async c => {
    const key = c.req.path.replace(/^\/img\//, '');
    if (!KEY.test(key)) return c.json({ error: 'not found' }, 404, NO_STORE);
    const object = await c.env.IMAGES.get(key);
    if (!object) return c.json({ error: 'not found' }, 404, NO_STORE);
    // Crest keys change when ESPN's crest URL does, so a long lifetime is safe.
    return c.body(object.body, 200, {
        ...cacheFor(30 * 86400, 86400),
        'Cache-Control': 'public, max-age=604800',
        'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream',
        ETag: object.httpEtag,
    });
});
