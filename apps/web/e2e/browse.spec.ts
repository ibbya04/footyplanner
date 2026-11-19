import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
    await page.goto('/next/');
});

const fixtureList = (page: import('@playwright/test').Page) => page.getByRole('list', { name: 'Fixtures' });

test('lists fixtures in kick-off order, and a day chip narrows the list', async ({ page }) => {
    const items = fixtureList(page).getByRole('listitem');
    await expect(items).toHaveCount(3);
    await expect(items.first()).toContainText('Liverpool v Arsenal');

    const days = page.getByRole('navigation', { name: 'Days' }).getByRole('button');
    await expect(days).toHaveCount(3);
    await days.nth(1).click();

    await expect(items).toHaveCount(1);
    await expect(items.first()).toContainText('Real Madrid v Barcelona');
    await expect(page).toHaveURL(/[?&]day=\d{4}-\d{2}-\d{2}/);
});

test('turning a competition off hides its fixtures, and the choice survives a reload', async ({ page }) => {
    const items = fixtureList(page).getByRole('listitem');
    await expect(items).toHaveCount(3);

    await page.getByRole('button', { name: /^Competitions/ }).click();
    await page.getByRole('button', { name: 'La Liga', exact: true }).click();

    await expect(items).toHaveCount(2);
    await expect(fixtureList(page)).not.toContainText('Real Madrid');
    await expect(page).toHaveURL(/[?&]comps=/);

    await page.reload();
    await expect(items).toHaveCount(2);
});

test('date presets and the date fields set the range, and the default range keeps a clean URL', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-11-18T10:00:00'));
    await page.goto('/next/');

    await page.getByRole('button', { name: 'This weekend' }).click();
    await expect(page).toHaveURL(/[?&]from=2026-11-20&to=2026-11-22/);

    await page.getByLabel('From').fill('2026-12-01');
    await page.getByLabel('To').fill('2026-12-14');
    await expect(page).toHaveURL(/[?&]from=2026-12-01&to=2026-12-14/);

    await page.getByRole('button', { name: '7 days' }).click();
    await expect(page).toHaveURL(/\/next\/$/);
});

test('cards explain TBC kick-offs and flag venues only located to their city', async ({ page }) => {
    const items = fixtureList(page).getByRole('listitem');
    const tbc = items.filter({ hasText: 'Real Madrid v Barcelona' });
    const cityLevel = items.filter({ hasText: 'Telstar v Ajax' });

    await expect(tbc).toContainText('time TBC');
    await expect(tbc).toContainText('Kick-off time due to be announced any day');
    await expect(cityLevel).toContainText('Location approximate');
    await expect(items.filter({ hasText: 'Liverpool v Arsenal' })).not.toContainText('Location approximate');
});

test('says how long ago the data was last updated', async ({ page }) => {
    await expect(page.getByText(/^Data updated [34] min ago$/)).toBeVisible();
});

test('search narrows the list and is kept in the URL', async ({ page }) => {
    const items = fixtureList(page).getByRole('listitem');
    await expect(items).toHaveCount(3);

    await page.getByRole('searchbox', { name: 'Search fixtures' }).fill('madrid');

    await expect(items).toHaveCount(1);
    await expect(items.first()).toContainText('Real Madrid v Barcelona');
    await expect(page).toHaveURL(/[?&]q=madrid/);
});

test('"only in map view" follows the map as you zoom', async ({ page }) => {
    const items = fixtureList(page).getByRole('listitem');
    await page.getByRole('checkbox', { name: 'Only fixtures in map view' }).check();
    await expect(items).toHaveCount(3);
    await expect(page).toHaveURL(/[?&]in=map/);

    for (let i = 0; i < 3; i++) {
        await page.getByRole('button', { name: 'Zoom in' }).click();
        await expect(page.locator('.leaflet-zoom-anim')).toHaveCount(0);
    }

    await expect(items).toHaveCount(0);
});

test('dragging the sidebar edge resizes it, and the width is kept', async ({ page }) => {
    const sidebar = page.getByRole('complementary');
    const handle = page.getByRole('separator', { name: 'Resize sidebar' });
    const width = async () => (await sidebar.boundingBox())?.width ?? 0;
    expect(await width()).toBe(400);

    const box = await handle.boundingBox();
    if (!box) throw new Error('no resize handle');
    await page.mouse.move(box.x + box.width / 2, box.y + 200);
    await page.mouse.down();
    await page.mouse.move(box.x + 120, box.y + 200, { steps: 5 });
    await page.mouse.up();

    expect(Math.round(await width())).toBeGreaterThan(500);
    await page.reload();
    expect(Math.round(await width())).toBeGreaterThan(500);
});

test.describe('in Tokyo', () => {
    test.use({ timezoneId: 'Asia/Tokyo' });

    test('the time zone toggle switches kick-offs between venue time and yours', async ({ page }) => {
        const card = fixtureList(page).getByRole('listitem').filter({ hasText: 'Liverpool v Arsenal' });
        await expect(card).toContainText('15:00 GMT');

        await page.getByRole('radio', { name: 'My time' }).check();

        await expect(card).toContainText('00:00 GMT+9');
        await expect(page).toHaveURL(/[?&]tz=mine/);
    });
});
