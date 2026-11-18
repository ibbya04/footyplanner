import { describe, expect, it } from 'vitest';
import { distanceKm, inUefaRegion, roundCoord } from '../src';

describe('distanceKm', () => {
    it('measures London to Paris at about 344 km', () => {
        const d = distanceKm({ lat: 51.5074, lng: -0.1278 }, { lat: 48.8566, lng: 2.3522 });
        expect(d).toBeGreaterThan(340);
        expect(d).toBeLessThan(348);
    });

    it('is zero for the same point', () => {
        expect(distanceKm({ lat: 40, lng: 3 }, { lat: 40, lng: 3 })).toBe(0);
    });
});

describe('inUefaRegion', () => {
    it('accepts European cities, including the edges', () => {
        expect(inUefaRegion({ lat: 43.7384, lng: 7.4246 })).toBe(true); // Monaco
        expect(inUefaRegion({ lat: 28.1, lng: -15.4 })).toBe(true); // Las Palmas
        expect(inUefaRegion({ lat: 51.17, lng: 71.45 })).toBe(true); // Astana
    });

    it("rejects France's Indian Ocean territories and missing points", () => {
        expect(inUefaRegion({ lat: -49.35, lng: 70.22 })).toBe(false); // Kerguelen
        expect(inUefaRegion(null)).toBe(false);
        expect(inUefaRegion(undefined)).toBe(false);
    });
});

describe('roundCoord', () => {
    it('rounds to 5 decimal places', () => {
        expect(roundCoord(51.5550123456)).toBe(51.55501);
    });
});
