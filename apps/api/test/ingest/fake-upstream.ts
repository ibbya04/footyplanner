import type { EspnScoreboard } from '@footyplanner/shared';
import { json, mockUpstream } from '../helpers';
import eng1 from '../fixtures/espn/eng.1-202611.json';

export const ENG1_NOVEMBER = eng1 as unknown as EspnScoreboard;
export const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export interface FakeUpstream {
    espn: Map<string, EspnScoreboard | number>;
    photon: (q: string, tag: string) => { lat: number; lng: number }[];
    calls: string[];
}

export function fakeUpstream(): FakeUpstream {
    const fake: FakeUpstream = {
        espn: new Map([['eng.1 202611', structuredClone(ENG1_NOVEMBER)]]),
        photon: () => [],
        calls: [],
    };
    mockUpstream(url => {
        if (url.hostname === 'site.api.espn.com') {
            const comp = url.pathname.split('/').at(-2)!;
            const key = `${comp} ${url.searchParams.get('dates')}`;
            fake.calls.push(`espn ${key}`);
            const body = fake.espn.get(key) ?? { events: [] };
            return typeof body === 'number' ? json({}, body) : json(body);
        }
        if (url.hostname === 'photon.komoot.io') {
            fake.calls.push(`photon ${url.searchParams.get('q')}`);
            const features = fake
                .photon(url.searchParams.get('q')!, url.searchParams.get('osm_tag')!)
                .map(p => ({ geometry: { coordinates: [p.lng, p.lat] } }));
            return json({ features });
        }
        if (url.hostname === 'a.espncdn.com') {
            fake.calls.push(`image ${url.pathname}`);
            return new Response(PNG, { headers: { 'Content-Type': 'image/png' } });
        }
        throw new Error(`unexpected fetch ${url}`);
    });
    return fake;
}
