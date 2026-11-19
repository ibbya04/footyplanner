import type { Page } from '@playwright/test';
import { expect, test } from './test';

const PHOTON = 'https://photon.komoot.io/**';

const fixtureList = (page: Page) => page.getByRole('region', { name: 'Fixtures' });
const nearButton = (page: Page) => page.getByRole('button', { name: /^Near a place/ });
const nearDialog = (page: Page) => page.getByRole('dialog', { name: 'Near a place' });

test('searching for a place shows fixtures within 100 km of it, with their distance', async ({ page }) => {
    const searches: string[] = [];
    await page.route(PHOTON, route => {
        searches.push(new URL(route.request().url()).searchParams.get('q') ?? '');
        return route.fulfill({ path: 'e2e/photon/amsterdam.json' });
    });
    await page.goto('/next/');

    await nearButton(page).click();
    await nearDialog(page).getByRole('combobox', { name: 'Find fixtures near a place' }).fill('Amster');
    const options = page.getByRole('option');
    await expect(options).toHaveCount(1);
    await expect(options.first()).toContainText('North Holland, Netherlands');
    await options.first().click();

    await expect(nearDialog(page)).toBeHidden();
    await expect(nearButton(page)).toContainText('Amsterdam · 100 km');
    const items = fixtureList(page).getByRole('listitem');
    await expect(items).toHaveCount(1);
    await expect(items.first()).toContainText('Telstar v Ajax');
    await expect(items.first()).toContainText(/\d+ km · ≈\d+ min$/);
    await expect(page).toHaveURL(/[?&]n=52\.3731%2C4\.8936%2C100%2CAmsterdam/);
    expect(searches).toEqual(['Amster']);
});

test('sorting by distance and changing the radius', async ({ page }) => {
    await page.goto('/next/?n=52.63,1.30,400,Norwich');
    const items = fixtureList(page).getByRole('listitem');
    await expect(items).toHaveCount(2);
    await expect(items.first()).toContainText('Liverpool v Arsenal');

    await nearButton(page).click();
    await nearDialog(page).getByRole('button', { name: 'Distance' }).click();

    await expect(items.first()).toContainText('Telstar v Ajax');
    await expect(fixtureList(page).getByRole('heading')).toHaveText(['Nearest to Norwich2']);
    await expect(page).toHaveURL(/[?&]sort=distance/);

    await nearDialog(page).getByRole('button', { name: '25 km' }).click();
    await expect(items).toHaveCount(0);
    await expect(fixtureList(page)).toContainText('No fixtures within 25 km of Norwich.');
    await expect(page).toHaveURL(/[?&]n=52\.6300%2C1\.3000%2C25%2CNorwich/);
});

test('"My location" uses where the browser says you are', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 53.4084, longitude: -2.9916 });
    await page.goto('/next/');

    await nearButton(page).click();
    await nearDialog(page).getByRole('button', { name: 'My location' }).click();

    await expect(nearButton(page)).toContainText('My location · 100 km');
    await expect(fixtureList(page).getByRole('listitem')).toHaveCount(1);
    await expect(fixtureList(page).getByRole('listitem').first()).toContainText('Liverpool v Arsenal');
});

test('clearing the place goes back to anywhere and a clean URL', async ({ page }) => {
    await page.goto('/next/?n=52.63,1.30,400,Norwich&sort=distance');

    await nearButton(page).click();
    await nearDialog(page).getByRole('button', { name: 'Clear place' }).click();

    await expect(nearButton(page)).toContainText('Anywhere');
    await expect(fixtureList(page).getByRole('listitem')).toHaveCount(3);
    await expect(page).toHaveURL(/\/next\/$/);
});

test('says when place search is unavailable', async ({ page }) => {
    await page.route(PHOTON, route => route.fulfill({ status: 503, body: 'down' }));
    await page.goto('/next/');

    await nearButton(page).click();
    await nearDialog(page).getByRole('combobox', { name: 'Find fixtures near a place' }).fill('Amster');

    await expect(nearDialog(page)).toContainText('Place search is unavailable right now');
});

test('dates: pick a start and an end on the calendar', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-11-18T10:00:00'));
    await page.goto('/next/');
    const dates = page.getByRole('button', { name: /^Dates/ });
    const calendar = page.getByRole('dialog', { name: 'Choose dates' });
    await expect(dates).toContainText('18–24 Nov');
    await expect(dates).toContainText('7 days');

    await dates.click();
    await expect(calendar).toContainText('November 2026');
    await calendar.getByRole('button', { name: 'Next month' }).click();
    await calendar.getByRole('button', { name: 'Tue 1 Dec' }).click();
    await expect(calendar).toContainText('Now pick an end date (up to 62 days)');
    await calendar.getByRole('button', { name: 'Mon 14 Dec' }).click();

    await expect(calendar).toBeHidden();
    await expect(page).toHaveURL(/[?&]from=2026-12-01&to=2026-12-14/);
    await expect(dates).toContainText('1–14 Dec');

    await dates.click();
    await calendar.getByRole('button', { name: 'This weekend' }).click();
    await expect(page).toHaveURL(/[?&]from=2026-11-20&to=2026-11-22/);
    await expect(calendar).toBeHidden();
});

test('popovers close on Escape and on a click outside, and only one is open at a time', async ({ page }) => {
    const dates = page.getByRole('button', { name: /^Dates/ });
    const calendar = page.getByRole('dialog', { name: 'Choose dates' });
    await page.goto('/next/');

    await dates.click();
    await expect(calendar).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(calendar).toBeHidden();
    await expect(dates).toBeFocused();

    await dates.click();
    await nearButton(page).click();
    await expect(calendar).toBeHidden();
    await expect(nearDialog(page)).toBeVisible();

    await fixtureList(page).click({ position: { x: 5, y: 5 } });
    await expect(nearDialog(page)).toBeHidden();
});
