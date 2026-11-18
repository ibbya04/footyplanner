import { distanceKm, inUefaRegion, roundCoord, type Point } from '@footyplanner/shared';
import { getJson } from './upstream';

export interface VenueQuery {
    name: string;
    city: string;
    country: string;
}

export interface VenueLocation extends Point {
    precision: 'stadium' | 'city';
}

interface PhotonFeature {
    geometry: { coordinates: [number, number] };
}

async function photon(base: string, params: Record<string, string>): Promise<PhotonFeature[]> {
    const qs = new URLSearchParams({ lang: 'en', ...params });
    const data = await getJson<{ features?: PhotonFeature[] }>(`${base}?${qs}`);
    return Array.isArray(data.features) ? data.features : [];
}

const point = (f: PhotonFeature): Point => ({ lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] });

// Same strategy as the page: find the city, then the nearest stadium within 40 km of it.
export async function geocodeVenue(
    photonUrl: string,
    { name, city, country }: VenueQuery,
): Promise<VenueLocation | null> {
    let cityPt: Point | null = null;
    // ESPN's country can be wrong (Monaco is listed as France), so fall back to the city alone.
    for (const q of [country && city ? `${city}, ${country}` : null, city].filter(Boolean) as string[]) {
        cityPt = (await photon(photonUrl, { q, osm_tag: 'place', limit: '5' })).map(point).find(inUefaRegion) ?? null;
        if (cityPt) break;
    }
    if (name) {
        const params: Record<string, string> = { q: name, osm_tag: 'leisure:stadium', limit: '5' };
        if (cityPt) Object.assign(params, { lat: String(cityPt.lat), lon: String(cityPt.lng) });
        else if (country) params.q = `${name} ${country}`;
        const best = (await photon(photonUrl, params))
            .map(f => ({ p: point(f), d: cityPt ? distanceKm(cityPt, point(f)) : 0 }))
            .filter(x => inUefaRegion(x.p) && (!cityPt || x.d < 40))
            .sort((a, b) => a.d - b.d)[0];
        if (best) return { lat: roundCoord(best.p.lat), lng: roundCoord(best.p.lng), precision: 'stadium' };
    }
    return cityPt ? { lat: roundCoord(cityPt.lat), lng: roundCoord(cityPt.lng), precision: 'city' } : null;
}
