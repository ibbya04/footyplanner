import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, json, mockUpstream } from './helpers';

const feature = (lat: number, lng: number) => ({ geometry: { coordinates: [lng, lat] } });
const LONDON = feature(51.5074, -0.1278);
const EMIRATES = feature(51.555, -0.108);
const KERGUELEN = feature(-49.35, 70.22);

afterEach(() => {
    vi.restoreAllMocks();
});

describe('GET /api/venue', () => {
    it('finds the stadium near the city', async () => {
        mockUpstream(url => json({ features: url.searchParams.get('osm_tag') === 'place' ? [LONDON] : [EMIRATES] }));
        const res = await api('/api/venue?name=Emirates%20Stadium&city=London&country=England');
        expect(await res.json()).toEqual({ lat: 51.555, lng: -0.108, precision: 'stadium' });
        expect(res.headers.get('Cloudflare-CDN-Cache-Control')).toContain('max-age=2592000');
    });

    it('falls back to the city when the stadium is too far away', async () => {
        const farAway = feature(53.4831, -2.2004); // Manchester
        mockUpstream(url => json({ features: url.searchParams.get('osm_tag') === 'place' ? [LONDON] : [farAway] }));
        const res = await api('/api/venue?name=Emirates%20Stadium&city=London&country=England');
        expect(await res.json()).toEqual({ lat: 51.5074, lng: -0.1278, precision: 'city' });
    });

    it('skips results outside Europe and retries the city without the country', async () => {
        const monaco = feature(43.7384, 7.4246);
        const queries: string[] = [];
        mockUpstream(url => {
            const q = url.searchParams.get('q')!;
            queries.push(q);
            if (q === 'Monaco, France') return json({ features: [KERGUELEN] });
            if (q === 'Monaco') return json({ features: [monaco] });
            return json({ features: [] });
        });
        const res = await api('/api/venue?name=Stade%20Louis%20II&city=Monaco&country=France');
        expect(await res.json()).toEqual({ lat: 43.7384, lng: 7.4246, precision: 'city' });
        expect(queries.slice(0, 2)).toEqual(['Monaco, France', 'Monaco']);
    });

    it('reports a miss, cached for a day', async () => {
        mockUpstream(() => json({ features: [] }));
        const res = await api('/api/venue?name=Nowhere&city=Atlantis');
        expect(await res.json()).toEqual({ miss: true });
        expect(res.headers.get('Cloudflare-CDN-Cache-Control')).toContain('max-age=86400');
    });

    it('returns 502, uncached, when Photon is down', async () => {
        mockUpstream(() => json({}, 503));
        const res = await api('/api/venue?city=London');
        expect(res.status).toBe(502);
        expect(res.headers.get('Cache-Control')).toBe('no-store');
    });

    it('needs a name or a city', async () => {
        const res = await api('/api/venue?country=England');
        expect(res.status).toBe(400);
        expect(await res.json()).toEqual({ error: 'name or city required' });
    });
});
