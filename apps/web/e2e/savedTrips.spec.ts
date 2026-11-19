import type { APIRequestContext, Browser, Page } from '@playwright/test';
import { expect, test } from './test';

const shortlistTab = (page: Page) => page.getByRole('tab', { name: /Shortlist/ });
const shortlist = (page: Page) => page.getByRole('region', { name: 'Shortlist' });
const savedTrip = (page: Page) => page.getByRole('region', { name: 'Saved trip' });

async function save(page: Page, title: string) {
    await page
        .getByRole('region', { name: 'Fixtures' })
        .getByRole('button', { name: `Save ${title} to shortlist` })
        .click();
}

async function saveTrip(page: Page, titles: string[]) {
    await page.goto('/');
    for (const title of titles) await save(page, title);
    await shortlistTab(page).click();
    await savedTrip(page).getByRole('button', { name: 'Save trip' }).click();
    await expect(savedTrip(page)).toContainText('Saved');
    const page_ = await savedTrip(page).getByRole('textbox', { name: 'Link to share' }).inputValue();
    const edit = await savedTrip(page).getByRole('textbox', { name: 'Edit link' }).inputValue();
    return { page: page_, edit, id: new URL(page_).pathname.split('/').pop()! };
}

async function tripOnServer(request: APIRequestContext, id: string) {
    const res = await request.get(`/api/trips/${id}`);
    return (await res.json()) as { name: string | null; fixtures: { id: string }[] };
}

async function freshPage(browser: Browser) {
    const context = await browser.newContext();
    return context.newPage();
}

test('saving the shortlist as a trip gives a link to share, an edit link and a calendar feed', async ({ page }) => {
    const links = await saveTrip(page, ['Liverpool v Arsenal', 'Real Madrid v Barcelona']);

    expect(links.page).toMatch(/\/t\/[A-Za-z0-9_-]{10}$/);
    expect(links.edit).toMatch(/\/t\/[A-Za-z0-9_-]{10}#edit=[A-Za-z0-9_-]{43}$/);
    await expect(savedTrip(page).getByRole('link', { name: 'Subscribe in calendar' })).toHaveAttribute(
        'href',
        `${links.page.replace(/^http:/, 'webcal:')}.ics`,
    );
    await expect(savedTrip(page).getByRole('button', { name: 'Save trip' })).toHaveCount(0);

    await page.reload();
    await shortlistTab(page).click();
    await expect(savedTrip(page).getByRole('textbox', { name: 'Link to share' })).toHaveValue(links.page);
});

test('changes to a saved shortlist are saved to the trip', async ({ page, request }) => {
    const { id } = await saveTrip(page, ['Liverpool v Arsenal']);

    await shortlistTab(page).click();
    await page.getByRole('tab', { name: 'Fixtures' }).click();
    await save(page, 'Telstar v Ajax');
    await shortlistTab(page).click();
    await savedTrip(page).getByRole('textbox', { name: 'Trip name' }).fill('Weekend away');
    await expect(savedTrip(page)).toContainText('Saved');

    await expect
        .poll(async () => tripOnServer(request, id))
        .toMatchObject({ name: 'Weekend away', fixtures: [{ id: 'eng.1:e2e-1' }, { id: 'ned.1:e2e-3' }] });
});

test('anyone with the link sees the trip and can copy it to their own shortlist', async ({ page, browser }) => {
    const links = await saveTrip(page, ['Liverpool v Arsenal', 'Telstar v Ajax']);
    await savedTrip(page).getByRole('textbox', { name: 'Trip name' }).fill('Weekend away');
    await expect(savedTrip(page)).toContainText('Saved');

    const friend = await freshPage(browser);
    await friend.goto(links.page);
    const trip = friend.getByRole('region', { name: 'Trip' });
    await expect(trip.getByRole('heading', { name: 'Weekend away' })).toBeVisible();
    await expect(trip.getByRole('listitem')).toHaveCount(2);
    await expect(trip.getByRole('button', { name: /Remove .* from shortlist/ })).toHaveCount(0);
    await expect(trip.getByRole('link', { name: 'Subscribe in calendar' })).toHaveAttribute('href', /^webcal:/);
    await expect(friend.locator('.leaflet-overlay-pane path.route')).toHaveCount(1);

    await trip.getByRole('button', { name: 'Copy to my shortlist' }).click();
    await expect(friend).toHaveURL(/\/$/);
    await expect(shortlist(friend).getByRole('listitem')).toHaveCount(2);
    await expect(savedTrip(friend).getByRole('button', { name: 'Save trip' })).toBeVisible();
});

test('copying a trip asks before replacing a shortlist you already have', async ({ page, browser }) => {
    const links = await saveTrip(page, ['Liverpool v Arsenal']);

    const friend = await freshPage(browser);
    await friend.goto('/');
    await save(friend, 'Telstar v Ajax');
    await friend.goto(links.page);
    const trip = friend.getByRole('region', { name: 'Trip' });
    await trip.getByRole('button', { name: 'Copy to my shortlist' }).click();
    await expect(trip).toContainText('This replaces the 1 fixture on your shortlist');
    await trip.getByRole('button', { name: 'Keep mine' }).click();
    await expect(friend).toHaveURL(links.page);

    await trip.getByRole('button', { name: 'Copy to my shortlist' }).click();
    await trip.getByRole('button', { name: 'Replace' }).click();
    await expect(shortlist(friend).getByRole('listitem')).toHaveCount(1);
    await expect(shortlist(friend)).toContainText('Liverpool v Arsenal');
});

test('the edit link lets another browser keep editing the same trip', async ({ page, browser, request }) => {
    const links = await saveTrip(page, ['Liverpool v Arsenal', 'Telstar v Ajax']);

    const laptop = await freshPage(browser);
    await laptop.goto(links.edit);
    await expect(laptop).toHaveURL(/\/$/);
    await expect(shortlist(laptop).getByRole('listitem')).toHaveCount(2);
    await expect(savedTrip(laptop).getByRole('textbox', { name: 'Link to share' })).toHaveValue(links.page);

    await shortlist(laptop).getByRole('button', { name: 'Remove Telstar v Ajax from shortlist' }).click();
    await expect(savedTrip(laptop)).toContainText('Saved');
    await expect
        .poll(async () => (await tripOnServer(request, links.id)).fixtures.map(f => f.id))
        .toEqual(['eng.1:e2e-1']);
});

test('opening your own trip link goes to your shortlist', async ({ page }) => {
    const links = await saveTrip(page, ['Liverpool v Arsenal']);
    await page.goto(links.page);
    await expect(page).toHaveURL(/\/$/);
    await expect(shortlist(page).getByRole('listitem')).toHaveCount(1);
});

test('clearing a saved shortlist starts a new trip and leaves the saved one as it was', async ({ page, request }) => {
    const { id } = await saveTrip(page, ['Liverpool v Arsenal']);

    await shortlist(page).getByRole('button', { name: 'Clear' }).click();
    await expect(shortlist(page)).toContainText('Clear the shortlist and start a new trip? Your saved trip stays');
    await shortlist(page).getByRole('button', { name: 'Remove all' }).click();
    await expect(shortlist(page)).toContainText('Your shortlist is empty');

    await page.getByRole('tab', { name: 'Fixtures' }).click();
    await save(page, 'Telstar v Ajax');
    await shortlistTab(page).click();
    await expect(savedTrip(page).getByRole('button', { name: 'Save trip' })).toBeVisible();
    expect((await tripOnServer(request, id)).fixtures.map(f => f.id)).toEqual(['eng.1:e2e-1']);
});
