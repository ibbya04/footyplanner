import { Hono } from 'hono';
import { NO_STORE } from './cache';
import { runIngest } from './ingest/run';
import { competitionsRoute } from './routes/competitions';
import { fixturesRoute } from './routes/fixtures';
import { imagesRoute } from './routes/images';
import { statusRoute } from './routes/status';

const api = new Hono<{ Bindings: Env }>()
    .use(async (c, next) => {
        const ip = c.req.header('CF-Connecting-IP');
        if (ip && c.env.API_LIMITER) {
            const { success } = await c.env.API_LIMITER.limit({ key: ip });
            if (!success) return c.json({ error: 'too many requests' }, 429, { ...NO_STORE, 'Retry-After': '60' });
        }
        await next();
    })
    .route('/fixtures', fixturesRoute)
    .route('/competitions', competitionsRoute)
    .route('/status', statusRoute);

const app = new Hono<{ Bindings: Env }>()
    .route('/api', api)
    .route('/img', imagesRoute)
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
