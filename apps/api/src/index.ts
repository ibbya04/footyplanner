import { Hono } from 'hono';
import { NO_STORE } from './cache';
import { day } from './routes/day';
import { venue } from './routes/venue';

const app = new Hono<{ Bindings: Env }>()
    .basePath('/api')
    .route('/day', day)
    .route('/venue', venue)
    .notFound(c => c.json({ error: 'not found' }, 404, NO_STORE))
    .onError((err, c) => {
        console.error(err);
        return c.json({ error: 'server error' }, 500, NO_STORE);
    });

export type AppType = typeof app;
export default app;
