import type { Fixture } from '@footyplanner/shared';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createTrip, TripLostError, updateTrip } from '../api/trips';
import { browserStorage } from '../browserStorage';
import { forgetTripLink, pendingSave, readTripLink, type TripLink, writeTripLink } from './store';

const SAVE_DELAY_MS = 1000;
const RETRY_DELAY_MS = 5000;
const SAVE_FAILED = "Couldn't save the trip. Try again.";

export type SaveStatus = 'saving' | 'saved' | 'retrying';

export interface SavedTrip {
    link: TripLink | null;
    name: string;
    status: SaveStatus | null;
    creating: boolean;
    error: string | null;
    rename: (name: string) => void;
    save: () => void;
    forget: () => void;
}

export function useSavedTrip(saved: Fixture[]): SavedTrip {
    const [link, setLink] = useState(() => readTripLink(browserStorage));
    const [name, setName] = useState(link?.name ?? '');
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [failures, setFailures] = useState(0);

    const fixtureIds = useMemo(() => saved.map(f => f.id), [saved]);
    const tripName = name.trim() || null;
    const pending = useMemo(() => link && pendingSave(link, tripName, fixtureIds), [link, tripName, fixtureIds]);

    const remember = useCallback((next: TripLink | null) => {
        if (next) writeTripLink(browserStorage, next);
        else forgetTripLink(browserStorage);
        setLink(next);
    }, []);

    useEffect(() => {
        if (!link || !pending) return;
        const delay = failures ? RETRY_DELAY_MS : SAVE_DELAY_MS;
        const timer = setTimeout(() => {
            updateTrip(link, pending).then(
                () => {
                    setFailures(0);
                    remember({ ...link, name: pending.name, savedIds: pending.fixtureIds });
                },
                (err: unknown) => {
                    if (err instanceof TripLostError) {
                        setError(err.message);
                        remember(null);
                    } else {
                        setFailures(n => n + 1);
                    }
                },
            );
        }, delay);
        return () => clearTimeout(timer);
    }, [link, pending, failures, remember]);

    const save = useCallback(() => {
        if (!fixtureIds.length || creating) return;
        setCreating(true);
        setError(null);
        createTrip({ name: tripName, fixtureIds })
            .then(created =>
                remember({ id: created.id, editToken: created.editToken, name: tripName, savedIds: fixtureIds }),
            )
            .catch(() => setError(SAVE_FAILED))
            .finally(() => setCreating(false));
    }, [creating, fixtureIds, remember, tripName]);

    const forget = useCallback(() => {
        remember(null);
        setName('');
        setFailures(0);
    }, [remember]);

    const status: SaveStatus | null = !link ? null : !pending ? 'saved' : failures ? 'retrying' : 'saving';
    return { link, name, status, creating, error, rename: setName, save, forget };
}
