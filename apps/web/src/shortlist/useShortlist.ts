import type { Fixture } from '@footyplanner/shared';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { browserStorage } from '../browserStorage';
import { readShortlist, refreshSaved, toggleSaved, writeShortlist } from './store';

export interface Shortlist {
    saved: Fixture[];
    savedIds: Set<string>;
    toggle: (id: string) => void;
    clear: () => void;
}

export function useShortlist(fresh: Fixture[] | undefined): Shortlist {
    const [saved, setSaved] = useState(() => readShortlist(browserStorage));
    const [refreshedFrom, setRefreshedFrom] = useState<Fixture[] | undefined>(undefined);

    if (fresh !== refreshedFrom) {
        setRefreshedFrom(fresh);
        if (fresh) setSaved(refreshSaved(saved, fresh));
    }

    useEffect(() => {
        writeShortlist(browserStorage, saved);
    }, [saved]);

    const toggle = useCallback(
        (id: string) =>
            setSaved(current => {
                const fixture = current.find(f => f.id === id) ?? fresh?.find(f => f.id === id);
                return fixture ? toggleSaved(current, fixture) : current;
            }),
        [fresh],
    );
    const clear = useCallback(() => setSaved([]), []);
    const savedIds = useMemo(() => new Set(saved.map(f => f.id)), [saved]);

    return { saved, savedIds, toggle, clear };
}
