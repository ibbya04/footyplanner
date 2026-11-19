import type { Point } from '@footyplanner/shared';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { parsePlaces } from './photon';

const PHOTON = 'https://photon.komoot.io/api/';
const DEBOUNCE_MS = 250;
const MIN_LENGTH = 2;
const RESULTS = '6';

function useDebounced(value: string): string {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [value]);
    return debounced;
}

async function searchPhoton(q: string, bias: Point | null, signal: AbortSignal) {
    const params = new URLSearchParams({ q, limit: RESULTS });
    if (bias) {
        params.set('lat', bias.lat.toFixed(1));
        params.set('lon', bias.lng.toFixed(1));
    }
    const response = await fetch(`${PHOTON}?${params}`, { signal });
    if (!response.ok) throw new Error(`Photon returned ${response.status}`);
    return parsePlaces(await response.json());
}

export function usePlaces(text: string, bias: Point | null) {
    const q = useDebounced(text.trim());
    const centre = bias && { lat: Number(bias.lat.toFixed(1)), lng: Number(bias.lng.toFixed(1)) };
    return useQuery({
        queryKey: ['places', q, centre?.lat, centre?.lng],
        queryFn: ({ signal }) => searchPhoton(q, centre, signal),
        enabled: q.length >= MIN_LENGTH,
        staleTime: Infinity,
        retry: false,
    });
}
