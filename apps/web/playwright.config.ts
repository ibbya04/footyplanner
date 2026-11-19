import { defineConfig, devices } from '@playwright/test';

const PORT = 8788;
const STATE = '--persist-to .wrangler/e2e';

export default defineConfig({
    testDir: 'e2e',
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? 'github' : 'list',
    use: { baseURL: `http://localhost:${PORT}`, trace: 'retain-on-failure' },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
    webServer: {
        cwd: '../api',
        command: [
            `npx wrangler d1 migrations apply footyplanner --local ${STATE}`,
            `npx wrangler d1 execute footyplanner --local ${STATE} --file ../web/e2e/seed.sql`,
            `npx wrangler dev --port ${PORT} ${STATE}`,
        ].join(' && '),
        url: `http://localhost:${PORT}/api/competitions`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
    },
});
