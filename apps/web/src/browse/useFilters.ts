import { useCallback, useMemo, useState } from 'react';
import { readFilters, type UrlFilters, writeFilters } from './urlFilters';

export type UpdateFilters = (change: Partial<UrlFilters>) => void;

export function useFilters(competitions: string[], today: string): [UrlFilters, UpdateFilters] {
    const [query, setQuery] = useState(() => window.location.search);
    const context = useMemo(() => ({ competitions, today }), [competitions, today]);
    const filters = useMemo(() => readFilters(new URLSearchParams(query), context), [query, context]);

    const updateFilters = useCallback<UpdateFilters>(
        change => {
            const params = writeFilters({ ...filters, ...change }, context).toString();
            const next = params ? `?${params}` : '';
            window.history.replaceState(null, '', `${window.location.pathname}${next}`);
            setQuery(next);
        },
        [filters, context],
    );

    return [filters, updateFilters];
}
