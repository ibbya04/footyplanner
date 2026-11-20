import { Hono } from 'hono';
import { NO_STORE } from './cache';
import { runIngest } from './ingest/run';
import { rateLimit } from './rateLimit';
import { competitionsRoute } from './routes/competitions';
import { fixturesRoute } from './routes/fixtures';
import { imagesRoute } from './routes/images';
import { statusRoute } from './routes/status';
import { tripPagesRoute } from './routes/tripPages';
import { tripsRoute } from './routes/trips';

const api = new Hono<{ Bindings: Env }>()
    .use(rateLimit(env => env.API_LIMITER))
    .route('/fixtures', fixturesRoute)
    .route('/competitions', competitionsRoute)
    .route('/status', statusRoute)
    .route('/trips', tripsRoute);

const app = new Hono<{ Bindings: Env }>()
    .route('/api', api)
    .route('/img', imagesRoute)
    .route('/t', tripPagesRoute)
    .notFound(c => c.json({ error: 'not found' }, 404, NO_STORE))
    .onError((err, c) => {
        console.error(err);
        return c.json({ error: 'server error' }, 500, NO_STORE);
    });

export type AppType = typeof app;
export { app };

export default {
    fetch: app.fetch,
    async scheduled(controller, env, ctx) {
        ctx.waitUntil(runIngest(env, controller.scheduledTime));
    },
} satisfies ExportedHandler<Env>;
