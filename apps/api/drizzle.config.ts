import { defineConfig } from 'drizzle-kit';

// drizzle-kit only writes the SQL; `wrangler d1 migrations apply` runs it (locally, in tests and in CI).
export default defineConfig({
    dialect: 'sqlite',
    schema: './src/db/schema.ts',
    out: './migrations',
});
