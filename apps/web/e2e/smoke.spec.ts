import { expect, test } from '@playwright/test';

test('the map shows upcoming fixtures from the API', async ({ page }) => {
    await page.goto('/next/');

    await expect(page.getByRole('status')).toHaveText('3 fixtures');
    await expect(page.locator('.leaflet-tile-pane')).toBeAttached();

    const pin = page.locator('.leaflet-marker-pane [title="Liverpool v Arsenal"] > div');
    await expect(pin).toBeVisible();
    await pin.click();
    await expect(page.locator('.leaflet-popup')).toContainText('Liverpool v Arsenal');
    await expect(page.locator('.leaflet-popup')).toContainText('anfield, liverpool');
});

test('the legacy page still serves at the root', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle('Footy Planner');
});
