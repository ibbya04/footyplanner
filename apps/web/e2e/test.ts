import { test as base } from '@playwright/test';

export { expect } from '@playwright/test';

const octet = () => Math.floor(Math.random() * 254) + 1;

export const test = base.extend({
    page: async ({ page }, use) => {
        await page.setExtraHTTPHeaders({ 'CF-Connecting-IP': `10.${octet()}.${octet()}.${octet()}` });
        await use(page);
    },
});
