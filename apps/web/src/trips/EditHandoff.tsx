import type { TripResponse } from '@footyplanner/shared';
import { useEffect } from 'react';
import { useTrip } from '../api/trips';
import { browserStorage } from '../browserStorage';
import { readShortlist, writeShortlist } from '../shortlist/store';
import sidebarStyles from '../sidebar/Sidebar.module.css';
import { writeTripLink } from './store';

interface Props {
    id: string;
    editToken: string;
    onEditing: () => void;
    onViewOnly: () => void;
}

function takeOver(trip: TripResponse, editToken: string) {
    const fixtureIds = trip.fixtures.map(f => f.id);
    writeShortlist(browserStorage, trip.fixtures);
    writeTripLink(browserStorage, { id: trip.id, editToken, name: trip.name, savedIds: fixtureIds });
}

function replacesOtherFixtures(trip: TripResponse): number {
    const tripIds = new Set(trip.fixtures.map(f => f.id));
    const mine = readShortlist(browserStorage);
    return mine.some(f => !tripIds.has(f.id)) ? mine.length : 0;
}

export function EditHandoff({ id, editToken, onEditing, onViewOnly }: Props) {
    const trip = useTrip(id);
    const replacing = trip.data ? replacesOtherFixtures(trip.data) : 0;

    useEffect(() => {
        if (!trip.data || replacing) return;
        takeOver(trip.data, editToken);
        onEditing();
    }, [trip.data, replacing, editToken, onEditing]);

    if (trip.error) return <p role="status">Couldn&apos;t load the trip: {trip.error.message}</p>;
    if (!trip.data || !replacing) return <p role="status">Opening the trip…</p>;
    return (
        <section className={sidebarStyles.handoff} aria-label="Edit trip">
            <p>
                Edit <strong>{trip.data.name ?? 'this trip'}</strong> in this browser? It replaces the {replacing}{' '}
                fixture{replacing === 1 ? '' : 's'} on your shortlist here.
            </p>
            <button
                type="button"
                className={sidebarStyles.chip}
                onClick={() => {
                    takeOver(trip.data, editToken);
                    onEditing();
                }}
            >
                Replace and edit
            </button>
            <button type="button" className={sidebarStyles.chip} onClick={onViewOnly}>
                Just view it
            </button>
        </section>
    );
}
