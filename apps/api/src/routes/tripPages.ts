import { Hono } from 'hono';
import { cacheFor } from '../cache';
import { getDb } from '../db';
import { tripCalendar } from '../trips/calendar';
import { findTrip, loadTrip } from '../trips/load';

const FEED_CACHE_SECONDS = 15 * 60;
const FEED = /^(.+)\.ics$/;

export const tripPagesRoute = new Hono<{ Bindings: Env }>().get('/:name', async c => {
    const name = c.req.param('name');
    const db = getDb(c.env.DB);
    const feed = FEED.exec(name);
    if (feed) {
        const trip = await loadTrip(db, feed[1]!);
        if (!trip) return c.notFound();
        return c.body(await tripCalendar(db, trip, new Date()), 200, {
            ...cacheFor(FEED_CACHE_SECONDS),
            'Content-Type': 'text/calendar; charset=utf-8',
        });
    }
    if (!(await findTrip(db, name))) return c.notFound();
    return c.env.ASSETS.fetch(new URL('/', c.req.url));
});
