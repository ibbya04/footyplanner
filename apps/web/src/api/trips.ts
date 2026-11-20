import type { TripCreated, TripResponse } from '@footyplanner/shared';
import { useQuery } from '@tanstack/react-query';
import { parseResponse } from 'hono/client';
import type { TripBody, TripLink } from '../trips/store';
import { client } from './client';

export class TripLostError extends Error {}

export function createTrip(body: TripBody): Promise<TripCreated> {
    return parseResponse(client.api.trips.$post({ json: body }));
}

export async function updateTrip(link: TripLink, body: TripBody): Promise<void> {
    const res = await client.api.trips[':id'].$put(
        { param: { id: link.id }, json: body },
        { headers: { Authorization: `Bearer ${link.editToken}` } },
    );
    if (res.status === 401 || res.status === 404) throw new TripLostError('This browser can no longer edit the trip');
    if (!res.ok) throw new Error(`Saving failed (${res.status})`);
}

export function fetchTrip(id: string): Promise<TripResponse> {
    return parseResponse(client.api.trips[':id'].$get({ param: { id } }));
}

export function useTrip(id: string) {
    return useQuery({ queryKey: ['trip', id], queryFn: () => fetchTrip(id) });
}
