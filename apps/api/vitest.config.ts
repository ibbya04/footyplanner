import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';

// Tests run inside workerd with the bindings and vars from wrangler.jsonc. D1 and R2 are local and
// start empty for every test file; test/setup.ts applies the migrations (schema and seed data).
export default defineConfig(async () => {
    const migrations = await readD1Migrations('./migrations');
    return {
        plugins: [
            cloudflareTest({
                wrangler: { configPath: './wrangler.jsonc' },
                // Two months per run in tests, so a sweep that claims more than one month stays covered.
                miniflare: { bindings: { TEST_MIGRATIONS: migrations, INGEST_MONTHS_PER_RUN: '2' } },
            }),
        ],
        test: { setupFiles: ['./test/setup.ts'] },
    };
});
