import { expect, test } from './test';

test.beforeEach(async ({ page }) => {
    await page.goto('/');
});

const fixtureList = (page: import('@playwright/test').Page) => page.getByRole('region', { name: 'Fixtures' });

test('lists fixtures under a heading per day, and a day chip narrows the list', async ({ page }) => {
    const items = fixtureList(page).getByRole('listitem');
    await expect(items).toHaveCount(3);
    await expect(items.first()).toContainText('Liverpool v Arsenal');
    await expect(fixtureList(page).getByRole('heading')).toHaveCount(3);

    const days = page.getByRole('navigation', { name: 'Days' }).getByRole('button');
    await expect(days).toHaveCount(4);
    await expect(days.first()).toHaveText('All days');
    await expect(days.first()).toHaveAttribute('aria-pressed', 'true');
    await days.nth(2).click();

    await expect(items).toHaveCount(1);
    await expect(items.first()).toContainText('Real Madrid v Barcelona');
    await expect(page).toHaveURL(/[?&]day=\d{4}-\d{2}-\d{2}/);

    await days.first().click();
    await expect(items).toHaveCount(3);
    await expect(page).not.toHaveURL(/[?&]day=/);
});

test('hides the day chips when every fixture is on one day', async ({ page }) => {
    await page.getByRole('searchbox', { name: 'Search fixtures' }).fill('madrid');

    await expect(fixtureList(page).getByRole('listitem')).toHaveCount(1);
    await expect(page.getByRole('navigation', { name: 'Days' })).toBeHidden();
});

test('explains why the list is empty', async ({ page }) => {
    await page.getByRole('searchbox', { name: 'Search fixtures' }).fill('zzz');
    await expect(fixtureList(page)).toContainText('Nothing matches “zzz”.');

    await page.goto('/?from=2030-01-01&to=2030-01-07');
    await expect(fixtureList(page)).toContainText('No fixtures in these dates for the selected competitions.');
});

test('map popups explain TBC kick-offs and flag venues only located to their city', async ({ page }) => {
    await page.locator('.leaflet-marker-pane [title="Telstar v Ajax"] > div').click();
    await expect(page.locator('.leaflet-popup').filter({ hasText: 'Telstar' })).toContainText('Location approximate');

    await page.locator('.leaflet-marker-pane [title="Real Madrid v Barcelona"] > div').click();
    await expect(page.locator('.leaflet-popup').filter({ hasText: 'Real Madrid' })).toContainText(
        'Kick-off time due to be announced any day',
    );
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
    await expect(fixtureList(page)).toContainText('No fixtures in the visible map area.');
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

test.describe('this weekend', () => {
    test('on a Saturday it runs from today to Sunday', async ({ page }) => {
        await page.clock.setFixedTime(new Date('2026-11-21T10:00:00'));
        await page.goto('/');
        await page.getByRole('button', { name: /^Dates/ }).click();
        await page.getByRole('button', { name: 'This weekend' }).click();
        await expect(page).toHaveURL(/[?&]from=2026-11-21&to=2026-11-22/);
    });

    test('on a Sunday it is just today', async ({ page }) => {
        await page.clock.setFixedTime(new Date('2026-11-22T10:00:00'));
        await page.goto('/');
        await page.getByRole('button', { name: /^Dates/ }).click();
        await page.getByRole('button', { name: 'This weekend' }).click();
        await expect(page).toHaveURL(/[?&]from=2026-11-22&to=2026-11-22/);
    });
});

test('the calendar keeps the range valid: an earlier day restarts it, and it stops at 62 days', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-11-18T10:00:00'));
    await page.goto('/');
    const calendar = page.getByRole('dialog', { name: 'Choose dates' });

    await page.getByRole('button', { name: /^Dates/ }).click();
    await calendar.getByRole('button', { name: 'Next month' }).click();
    await calendar.getByRole('button', { name: 'Sun 20 Dec' }).click();
    await calendar.getByRole('button', { name: 'Sat 19 Dec' }).click();
    await expect(calendar).toContainText('Now pick an end date');
    await calendar.getByRole('button', { name: 'Next month' }).click();
    await calendar.getByRole('button', { name: 'Next month' }).click();

    await expect(calendar.getByRole('button', { name: 'Thu 18 Feb' })).toBeEnabled();
    await expect(calendar.getByRole('button', { name: 'Fri 19 Feb' })).toBeDisabled();
    await calendar.getByRole('button', { name: 'Thu 18 Feb' }).click();
    await expect(page).toHaveURL(/[?&]from=2026-12-19&to=2027-02-18/);
});

test('competition shortcuts: Big 5 + UEFA, All, and choosing everything again means all', async ({ page }) => {
    const items = fixtureList(page).getByRole('listitem');
    await page.getByRole('button', { name: /^Competitions/ }).click();

    await page.getByRole('button', { name: 'Big 5 + UEFA' }).click();
    await expect(items).toHaveCount(2);
    await expect(fixtureList(page)).not.toContainText('Telstar');

    await page.getByRole('button', { name: 'All', exact: true }).click();
    await expect(items).toHaveCount(3);
    await expect(page).toHaveURL(/\/$/);

    await page.getByRole('button', { name: 'La Liga', exact: true }).click();
    await page.getByRole('button', { name: 'La Liga', exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
});

test('"Data updated" says just now, hours or days as the last run gets older', async ({ page }) => {
    const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
    for (const [age, label] of [
        [20_000, 'Data updated just now'],
        [2 * 3_600_000 + 60_000, 'Data updated 2 h ago'],
        [3 * 86_400_000, 'Data updated 3 days ago'],
    ] as const) {
        const finishedAt = ago(age);
        await page.route('**/api/status', route =>
            route.fulfill({
                json: {
                    now: new Date().toISOString(),
                    lastRun: {
                        startedAt: finishedAt,
                        finishedAt,
                        mode: 'sweep',
                        espnCalls: 1,
                        fixturesWritten: 0,
                        errors: [],
                    },
                    competitions: [],
                    pending: { venues: 0, crests: 0 },
                },
            }),
        );
        await page.goto('/');
        await expect(page.getByText(label, { exact: true })).toBeVisible();
        await page.unroute('**/api/status');
    }
});

test('cards show the score, and a live tag while a fixture is in play', async ({ page }) => {
    await page.route('**/api/fixtures**', async route => {
        const body = await (await route.fetch()).json();
        const [first, ...rest] = body.fixtures;
        const live = {
            ...first,
            status: { state: 'in', name: 'STATUS_SECOND_HALF', detail: "67'" },
            score: { home: 2, away: 1 },
        };
        await route.fulfill({ json: { ...body, fixtures: [live, ...rest] } });
    });
    await page.goto('/');

    const card = fixtureList(page).getByRole('listitem').filter({ hasText: 'Liverpool v Arsenal' });
    await expect(card).toContainText("67'");
    await expect(card).toContainText('2–1');
});

test('changing any other filter clears the chosen day', async ({ page }) => {
    const days = page.getByRole('navigation', { name: 'Days' }).getByRole('button');
    const pickDay = async () => {
        await days.nth(1).click();
        await expect(page).toHaveURL(/[?&]day=/);
    };

    await pickDay();
    await page.getByRole('radio', { name: 'My time' }).check();
    await expect(page).not.toHaveURL(/[?&]day=/);

    await pickDay();
    await page.getByRole('button', { name: /^Dates/ }).click();
    await page.getByRole('button', { name: '14 days' }).click();
    await expect(page).not.toHaveURL(/[?&]day=/);

    await pickDay();
    await page.getByRole('button', { name: /^Competitions/ }).click();
    await page.getByRole('button', { name: 'Serie A', exact: true }).click();
    await expect(page).not.toHaveURL(/[?&]day=/);

    await pickDay();
    await page.getByRole('searchbox', { name: 'Search fixtures' }).fill('a');
    await expect(page).not.toHaveURL(/[?&]day=/);
});

test.describe('resizing the sidebar', () => {
    const sidebarWidth = async (page: import('@playwright/test').Page) =>
        Math.round((await page.getByRole('complementary').boundingBox())?.width ?? 0);
    const handle = (page: import('@playwright/test').Page) => page.getByRole('separator', { name: 'Resize sidebar' });

    async function dragTo(page: import('@playwright/test').Page, x: number) {
        const box = await handle(page).boundingBox();
        if (!box) throw new Error('no resize handle');
        await page.mouse.move(box.x + box.width / 2, box.y + 200);
        await page.mouse.down();
        await page.mouse.move(x, box.y + 200, { steps: 5 });
        await page.mouse.up();
    }

    test('always leaves room for the map, even after the window shrinks', async ({ page }) => {
        await dragTo(page, 1250);
        expect(await sidebarWidth(page)).toBe(760);

        await page.setViewportSize({ width: 900, height: 720 });
        await expect.poll(() => sidebarWidth(page)).toBe(580);
    });

    test('double-click puts it back to the default width', async ({ page }) => {
        await dragTo(page, 600);
        await handle(page).dblclick();
        expect(await sidebarWidth(page)).toBe(400);
    });

    test('arrow keys resize it in steps, bigger with Shift, within the limits', async ({ page }) => {
        await handle(page).focus();
        await page.keyboard.press('ArrowRight');
        expect(await sidebarWidth(page)).toBe(420);
        await page.keyboard.press('Shift+ArrowRight');
        expect(await sidebarWidth(page)).toBe(480);
        for (let i = 0; i < 12; i++) await page.keyboard.press('ArrowLeft');
        expect(await sidebarWidth(page)).toBe(300);
    });

    test('a cancelled drag stops resizing', async ({ page }) => {
        const box = await handle(page).boundingBox();
        if (!box) throw new Error('no resize handle');
        await page.mouse.move(box.x + box.width / 2, box.y + 200);
        await page.mouse.down();
        await handle(page).dispatchEvent('pointercancel');
        await page.mouse.move(box.x + 200, box.y + 200, { steps: 5 });
        await page.mouse.up();
        expect(await sidebarWidth(page)).toBe(400);
    });
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
