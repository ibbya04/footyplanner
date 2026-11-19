import { describe, expect, it } from 'vitest';
import { parsePlaces } from './photon';

function feature(lng: number, lat: number, properties: Record<string, string>) {
    return { type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] }, properties };
}

describe('parsePlaces', () => {
    it('labels each place with its name, then its city, region and country', () => {
        const places = parsePlaces({
            features: [
                feature(11.5755, 48.1374, { name: 'Munich', state: 'Bavaria', country: 'Germany', osm_value: 'city' }),
                feature(13.3777, 52.5163, { name: 'Hotel Adlon', city: 'Berlin', state: 'Berlin', country: 'Germany' }),
            ],
        });

        expect(places).toEqual([
            { name: 'Munich', detail: 'Bavaria, Germany', lat: 48.1374, lng: 11.5755 },
            { name: 'Hotel Adlon', detail: 'Berlin, Germany', lat: 52.5163, lng: 13.3777 },
        ]);
    });

    it('names a place without a name by its street and house number, or else its city', () => {
        const places = parsePlaces({
            features: [
                feature(13.38, 52.517, {
                    street: 'Unter den Linden',
                    housenumber: '77',
                    city: 'Berlin',
                    country: 'Germany',
                }),
                feature(4.62, 52.46, { city: 'Velsen', country: 'Netherlands' }),
            ],
        });

        expect(places.map(p => [p.name, p.detail])).toEqual([
            ['Unter den Linden 77', 'Berlin, Germany'],
            ['Velsen', 'Netherlands'],
        ]);
    });

    it('drops places with nothing to call them and places outside Europe', () => {
        const places = parsePlaces({
            features: [
                feature(2.35, 48.86, { country: 'France' }),
                feature(-74.006, 40.7128, { name: 'New York', country: 'United States' }),
                feature(2.3522, 48.8566, { name: 'Paris', country: 'France' }),
            ],
        });

        expect(places.map(p => p.name)).toEqual(['Paris']);
    });

    it('rejects a response that is not a list of places', () => {
        expect(() => parsePlaces({ message: 'rate limited' })).toThrow();
    });
});
