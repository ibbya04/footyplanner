import { expect, test } from './test';

test('the home page maps upcoming fixtures from the API', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('status')).toHaveText('3 fixtures');
    await expect(page.locator('.leaflet-tile-pane')).toBeAttached();

    const pin = page.locator('.leaflet-marker-pane [title="Liverpool v Arsenal"] > div');
    await expect(pin).toBeVisible();
    await pin.click();
    await expect(page.locator('.leaflet-popup')).toContainText('Liverpool v Arsenal');
    await expect(page.locator('.leaflet-popup')).toContainText('anfield, liverpool');
});
