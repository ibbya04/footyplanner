export interface Point {
    lat: number;
    lng: number;
}

// Great-circle distance in km (haversine).
export function distanceKm(a: Point, b: Point): number {
    const R = 6371;
    const toRad = (x: number) => (x * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
}

// UEFA's footprint (Azores/Canaries to Kazakhstan). Rejects mix-ups like "Monaco, France"
// resolving to France's Kerguelen Islands in the Indian Ocean.
export function inUefaRegion(p: Point | null | undefined): p is Point {
    return !!p && p.lat > 27 && p.lat < 72 && p.lng > -32 && p.lng < 80;
}

// 5 decimal places is about 1 m, plenty for a map pin.
export function roundCoord(n: number): number {
    return Math.round(n * 1e5) / 1e5;
}
