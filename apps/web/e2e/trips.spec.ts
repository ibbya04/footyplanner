import { expect, test } from './test';

test('a saved trip has a page and a calendar feed', async ({ page, request }) => {
    const created = await request.post('/api/trips', {
        data: { name: 'Weekend away', fixtureIds: ['eng.1:e2e-1', 'esp.1:e2e-2'] },
    });
    expect(created.status()).toBe(201);
    const { id } = (await created.json()) as { id: string };

    const response = await page.goto(`/t/${id}`);
    expect(response?.status()).toBe(200);
    await expect(page.locator('.leaflet-tile-pane')).toBeAttached();

    const feed = await request.get(`/t/${id}.ics`);
    expect(feed.headers()['content-type']).toBe('text/calendar; charset=utf-8');
    const ics = await feed.text();
    expect(ics).toContain('X-WR-CALNAME:Weekend away');
    expect(ics).toContain('SUMMARY:Liverpool v Arsenal (Premier League)');

    expect((await request.get('/t/AAAAAAAAAA')).status()).toBe(404);
});
