import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeEach } from 'vitest';

beforeEach(async () => {
    const { results } = await env.DB.prepare(
        `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'`,
    ).all<{ name: string }>();
    if (results.length) await env.DB.batch(results.map(t => env.DB.prepare(`DROP TABLE "${t.name}"`)));
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);

    const objects = await env.IMAGES.list();
    if (objects.objects.length) await env.IMAGES.delete(objects.objects.map(o => o.key));
});
