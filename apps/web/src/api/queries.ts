import { useQuery } from '@tanstack/react-query';
import { parseResponse } from 'hono/client';
import type { DateRange } from '../dates';
import { client } from './client';

const MINUTE = 60_000;

export function useCompetitions() {
    return useQuery({
        queryKey: ['competitions'],
        queryFn: () => parseResponse(client.api.competitions.$get()),
        staleTime: 60 * MINUTE,
    });
}

export function useStatus() {
    return useQuery({
        queryKey: ['status'],
        queryFn: () => parseResponse(client.api.status.$get()),
        refetchInterval: MINUTE,
    });
}

export function useFixtures(range: DateRange) {
    return useQuery({
        queryKey: ['fixtures', range.from, range.to],
        queryFn: () => parseResponse(client.api.fixtures.$get({ query: range })),
        staleTime: MINUTE,
        refetchInterval: 2 * MINUTE,
    });
}
