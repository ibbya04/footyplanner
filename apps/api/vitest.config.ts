import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';

export default defineConfig(async () => {
    const migrations = await readD1Migrations('./migrations');
    return {
        plugins: [
            cloudflareTest({
                wrangler: { configPath: './wrangler.jsonc' },
                miniflare: { bindings: { TEST_MIGRATIONS: migrations, INGEST_MONTHS_PER_RUN: '2' } },
            }),
        ],
        test: { setupFiles: ['./test/setup.ts'] },
    };
});
