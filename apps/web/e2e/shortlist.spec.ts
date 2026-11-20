import { readFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';
import { expect, test } from './test';

test.beforeEach(async ({ page }) => {
    await page.goto('/');
});

const shortlistTab = (page: Page) => page.getByRole('tab', { name: /Shortlist/ });
const shortlist = (page: Page) => page.getByRole('region', { name: 'Shortlist' });

async function save(page: Page, title: string) {
    await page
        .getByRole('region', { name: 'Fixtures' })
        .getByRole('button', { name: `Save ${title} to shortlist` })
        .click();
}

test('saved fixtures make an itinerary that survives a reload', async ({ page }) => {
    await save(page, 'Liverpool v Arsenal');
    await save(page, 'Real Madrid v Barcelona');
    await expect(shortlistTab(page)).toContainText('2');

    await page.reload();
    await shortlistTab(page).click();

    const items = shortlist(page).getByRole('listitem');
    await expect(items).toHaveCount(2);
    await expect(items.first()).toContainText('Liverpool v Arsenal');
    await expect(items.last()).toContainText('Real Madrid v Barcelona');
    await expect(shortlist(page)).toContainText('door to door by air · times not confirmed yet');
    await expect(page.locator('.leaflet-overlay-pane path.route')).toHaveCount(1);
});

test('exports the shortlist to a calendar file and links to directions', async ({ page }) => {
    await save(page, 'Liverpool v Arsenal');
    await save(page, 'Telstar v Ajax');
    await shortlistTab(page).click();

    await expect(shortlist(page).getByRole('link', { name: 'Directions' }).first()).toHaveAttribute(
        'href',
        'https://www.google.com/maps/search/?api=1&query=anfield%20liverpool',
    );

    const download = page.waitForEvent('download');
    await shortlist(page).getByRole('button', { name: 'Add all to calendar' }).click();
    const ics = await readFile(await (await download).path(), 'utf8');
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics).toContain('SUMMARY:Liverpool v Arsenal (Premier League)');
});

test('removing fixtures and clearing the shortlist', async ({ page }) => {
    await save(page, 'Liverpool v Arsenal');
    await save(page, 'Telstar v Ajax');
    await shortlistTab(page).click();

    await shortlist(page).getByRole('button', { name: 'Remove Telstar v Ajax from shortlist' }).click();
    await expect(shortlist(page).getByRole('listitem')).toHaveCount(1);

    await shortlist(page).getByRole('button', { name: 'Clear' }).click();
    await shortlist(page).getByRole('button', { name: 'Remove all' }).click();
    await expect(shortlist(page)).toContainText('Your shortlist is empty');
    await expect(shortlist(page)).toContainText(
        'Tap ☆ on any fixture to save it here, and see your own custom itinerary',
    );
    await expect(shortlistTab(page)).not.toContainText(/\d/);
});
