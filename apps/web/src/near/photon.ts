import { inUefaRegion } from '@footyplanner/shared';
import { z } from 'zod';

export interface Place {
    name: string;
    detail: string;
    lat: number;
    lng: number;
}

const text = z.string().optional();

const photonResponse = z.object({
    features: z.array(
        z.object({
            geometry: z.object({ coordinates: z.tuple([z.number(), z.number()]) }),
            properties: z.object({
                name: text,
                street: text,
                housenumber: text,
                city: text,
                state: text,
                country: text,
            }),
        }),
    ),
});

type Properties = z.infer<typeof photonResponse>['features'][number]['properties'];

function placeName(p: Properties): string {
    return p.name || [p.street, p.housenumber].filter(Boolean).join(' ') || p.city || '';
}

function placeDetail(p: Properties, name: string): string {
    const parts = [p.city !== name ? p.city : undefined, p.state, p.country].filter((v): v is string => !!v);
    return [...new Set(parts)].join(', ');
}

export function parsePlaces(json: unknown): Place[] {
    return photonResponse.parse(json).features.flatMap(({ geometry, properties }) => {
        const [lng, lat] = geometry.coordinates;
        const name = placeName(properties);
        if (!name || !inUefaRegion({ lat, lng })) return [];
        return [{ name, detail: placeDetail(properties, name), lat, lng }];
    });
}
