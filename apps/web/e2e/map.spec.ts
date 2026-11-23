import type { Page } from '@playwright/test';
import { expect, test } from './test';

test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('status')).toHaveText('3 fixtures');
});

const pin = (page: Page, title: string) => page.locator(`.leaflet-marker-pane [title="${title}"]`);

async function onScreen(page: Page, title: string) {
    if (!(await pin(page, title).count())) return false;
    const box = await pin(page, title).boundingBox();
    const map = await page.locator('.leaflet-container').boundingBox();
    if (!box || !map) return false;
    return box.x >= map.x && box.x <= map.x + map.width && box.y >= map.y && box.y <= map.y + map.height;
}

test('the sidebar names the app and says what it is for', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('footyplanner');
    await expect(page.getByText('See what matches are on across Europe')).toBeVisible();
});

test('"Fit matches" zooms the map to every listed fixture', async ({ page }) => {
    await page.getByRole('button', { name: 'Show Real Madrid v Barcelona on the map' }).click();
    await expect(page.locator('.leaflet-popup')).toBeVisible();
    await expect.poll(() => onScreen(page, 'Liverpool v Arsenal')).toBe(false);

    await page.getByRole('button', { name: 'Fit matches' }).click();

    for (const title of ['Liverpool v Arsenal', 'Real Madrid v Barcelona', 'Telstar v Ajax']) {
        await expect.poll(() => onScreen(page, title)).toBe(true);
    }
});

test('the map style can be changed and is remembered', async ({ page }) => {
    const style = page.getByRole('combobox', { name: 'Map style' });
    await expect(style).toHaveValue('dark');
    await expect(page.locator('.leaflet-tile-pane img[src*="World_Dark_Gray_Base"]').first()).toBeAttached();

    await style.selectOption({ label: 'Light' });
    await expect(page.locator('.leaflet-tile-pane img[src*="World_Light_Gray_Base"]').first()).toBeAttached();
    await expect(page.locator('.leaflet-tile-pane img[src*="World_Dark_Gray_Base"]')).toHaveCount(0);

    await page.reload();
    await expect(page.getByRole('combobox', { name: 'Map style' })).toHaveValue('light');
    await expect(page.locator('.leaflet-tile-pane img[src*="World_Light_Gray_Base"]').first()).toBeAttached();
});

test('the legend names the competition groups on the map', async ({ page }) => {
    const legend = page.getByRole('list', { name: 'Legend' });
    await expect(legend.getByRole('listitem')).toHaveText([
        'England',
        'Spain',
        'Rest of Europe',
        'Dashed pin = city, not exact ground',
    ]);

    await page.goto('/?comps=eng.1');
    await expect(legend.getByRole('listitem')).toHaveText(['England', 'Dashed pin = city, not exact ground']);
});

const zoomedToCity = (page: Page) => page.locator('.leaflet-tile-pane img[src*="/tile/11/"]').first();
const card = (page: Page, list: string, title: string) =>
    page.getByRole('region', { name: list }).getByRole('listitem').filter({ hasText: title });

test('choosing a fixture in the list flies the map to it and opens its popup', async ({ page }) => {
    await page.getByRole('button', { name: 'Show Real Madrid v Barcelona on the map' }).click();

    await expect(page.locator('.leaflet-popup')).toContainText('Real Madrid v Barcelona');
    await expect(zoomedToCity(page)).toBeAttached();
    await expect.poll(() => onScreen(page, 'Real Madrid v Barcelona')).toBe(true);
    await expect(card(page, 'Fixtures', 'Real Madrid v Barcelona')).toHaveAttribute('aria-current', 'true');
});

test('clicking a pin zooms the map to it and highlights its card in the list', async ({ page }) => {
    await pin(page, 'Telstar v Ajax').locator('> div').click();

    await expect(card(page, 'Fixtures', 'Telstar v Ajax')).toHaveAttribute('aria-current', 'true');
    await expect(card(page, 'Fixtures', 'Liverpool v Arsenal')).not.toHaveAttribute('aria-current', 'true');
    await expect(zoomedToCity(page)).toBeAttached();
    await expect(page.locator('.leaflet-popup')).toContainText('Telstar v Ajax');
});

test('shortlist items and their pins select each other the same way', async ({ page }) => {
    for (const title of ['Liverpool v Arsenal', 'Real Madrid v Barcelona']) {
        await page
            .getByRole('region', { name: 'Fixtures' })
            .getByRole('button', { name: `Save ${title} to shortlist` })
            .click();
    }
    await page.getByRole('tab', { name: /Shortlist/ }).click();

    await page.getByRole('button', { name: 'Show Liverpool v Arsenal on the map' }).click();
    await expect(page.locator('.leaflet-popup')).toContainText('Liverpool v Arsenal');
    await expect(zoomedToCity(page)).toBeAttached();

    await page.locator('.leaflet-popup-close-button').click();
    await page.getByRole('button', { name: 'Fit matches' }).click();
    await pin(page, 'Real Madrid v Barcelona').locator('> div').click();
    await expect(card(page, 'Shortlist', 'Real Madrid v Barcelona')).toHaveAttribute('aria-current', 'true');
});

test('zooming in after selecting a fixture keeps the map and popup working without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));

    await pin(page, 'Liverpool v Arsenal').locator('> div').click();
    await expect(page.locator('.leaflet-popup')).toContainText('Liverpool v Arsenal');
    await expect(zoomedToCity(page)).toBeAttached();
    await expect(page.locator('.leaflet-zoom-anim')).toHaveCount(0);

    for (let i = 0; i < 4; i++) {
        await page.getByRole('button', { name: 'Zoom in' }).click();
        await expect(page.locator('.leaflet-zoom-anim')).toHaveCount(0);
    }

    const pinBox = await pin(page, 'Liverpool v Arsenal').locator('> div').boundingBox();
    if (!pinBox) throw new Error('no pin');
    await page.mouse.move(pinBox.x + pinBox.width / 2, pinBox.y + pinBox.height / 2 + 5);
    for (let i = 0; i < 4; i++) {
        await page.mouse.wheel(0, -120);
        await page.waitForTimeout(150);
    }
    await expect(page.locator('.leaflet-zoom-anim')).toHaveCount(0);

    await expect(page.locator('.leaflet-container')).toBeVisible();
    await expect(page.locator('.leaflet-popup')).toContainText('Liverpool v Arsenal');
    expect(errors).toEqual([]);
});

test('picking a fixture at a venue with multiple fixtures keeps the cluster spiderfied and marks the chosen pin', async ({
    page,
}) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));

    await page.route('**/api/fixtures**', async route => {
        const body = await (await route.fetch()).json();
        const anfield = body.fixtures.find((f: { id: string }) => f.id === 'eng.1:e2e-1');
        const barcelona = body.fixtures.find((f: { id: string }) => f.id === 'esp.1:e2e-2').away;
        const second = {
            ...anfield,
            id: 'eng.1:e2e-1b',
            kickoff: new Date(Date.parse(anfield.kickoff) + 2 * 86_400_000).toISOString(),
            away: barcelona,
        };
        await route.fulfill({ json: { ...body, fixtures: [...body.fixtures, second] } });
    });

    await page.goto('/');
    await expect(page.getByRole('status')).toHaveText('4 fixtures');

    const cluster = page.locator('.leaflet-marker-pane .leaflet-marker-icon').filter({ hasText: /^2$/ });
    await expect(cluster).toBeVisible();
    await cluster.click();

    const firstPin = pin(page, 'Liverpool v Arsenal');
    const secondPin = pin(page, 'Liverpool v Barcelona');
    await expect(firstPin.locator('> div')).toBeVisible();
    await expect(secondPin.locator('> div')).toBeVisible();
    await expect(page.locator('.leaflet-cluster-anim')).toHaveCount(0);

    await secondPin.locator('> div').click();
    await expect(card(page, 'Fixtures', 'Liverpool v Barcelona')).toHaveAttribute('aria-current', 'true');
    await expect(page.locator('.leaflet-zoom-anim')).toHaveCount(0);
    await expect(page.locator('.leaflet-popup')).toContainText('Liverpool v Barcelona');
    await expect(firstPin.locator('> div')).toBeVisible();
    await expect(secondPin.locator('> div')).toBeVisible();
    await expect(secondPin.locator('> div')).toHaveAttribute('data-selected', 'true');
    await expect(firstPin.locator('> div')).not.toHaveAttribute('data-selected', 'true');

    await firstPin.locator('> div').click();
    await expect(card(page, 'Fixtures', 'Liverpool v Arsenal')).toHaveAttribute('aria-current', 'true');
    await expect(page.locator('.leaflet-popup')).toHaveCount(1);
    await expect(page.locator('.leaflet-popup')).toContainText('Liverpool v Arsenal');
    await expect(firstPin.locator('> div')).toBeVisible();
    await expect(secondPin.locator('> div')).toBeVisible();
    await expect(firstPin.locator('> div')).toHaveAttribute('data-selected', 'true');
    await expect(secondPin.locator('> div')).not.toHaveAttribute('data-selected', 'true');

    await page.getByRole('button', { name: 'Show Liverpool v Barcelona on the map' }).click();
    await expect(page.locator('.leaflet-popup')).toHaveCount(1);
    await expect(page.locator('.leaflet-popup')).toContainText('Liverpool v Barcelona');
    await expect(firstPin.locator('> div')).toBeVisible();
    await expect(secondPin.locator('> div')).toBeVisible();
    await expect(secondPin.locator('> div')).toHaveAttribute('data-selected', 'true');

    await page.getByRole('button', { name: 'Fit matches' }).click();
    await expect(cluster).toBeVisible();
    await page.getByRole('button', { name: 'Show Liverpool v Arsenal on the map' }).click();
    await expect(page.locator('.leaflet-popup')).toHaveCount(1);
    await expect(page.locator('.leaflet-popup')).toContainText('Liverpool v Arsenal');
    await expect(firstPin.locator('> div')).toBeVisible();
    await expect(secondPin.locator('> div')).toBeVisible();
    await expect(firstPin.locator('> div')).toHaveAttribute('data-selected', 'true');
    expect(errors).toEqual([]);
});
