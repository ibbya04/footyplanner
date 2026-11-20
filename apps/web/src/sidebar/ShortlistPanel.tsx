import { useState } from 'react';
import type { FixtureView } from '../browse/viewFixtures';
import { downloadIcs } from '../shortlist/download';
import type { SavedTrip } from '../trips/useSavedTrip';
import { Itinerary } from './Itinerary';
import styles from './Sidebar.module.css';
import { TripBox } from './TripBox';

interface Props {
    fixtures: FixtureView[];
    trip: SavedTrip;
    onToggle: (id: string) => void;
    onClear: () => void;
}

function ClearButton({ linked, onClear }: { linked: boolean; onClear: () => void }) {
    const [confirming, setConfirming] = useState(false);
    if (!confirming) {
        return (
            <button type="button" className={styles.chip} onClick={() => setConfirming(true)}>
                Clear
            </button>
        );
    }
    return (
        <span className={styles.confirm}>
            {linked && (
                <span className={styles.confirmText}>
                    Clear the shortlist and start a new trip? Your saved trip stays as it was.
                </span>
            )}
            <button type="button" className={styles.chip} onClick={onClear}>
                Remove all
            </button>
            <button type="button" className={styles.chip} onClick={() => setConfirming(false)}>
                Keep
            </button>
        </span>
    );
}

export function ShortlistPanel({ fixtures, trip, onToggle, onClear }: Props) {
    const clear = () => {
        trip.forget();
        onClear();
    };
    return (
        <section className={styles.list} aria-label="Shortlist">
            {!fixtures.length ? (
                <p className={styles.empty}>
                    <strong>Your shortlist is empty</strong>
                    <br />
                    Tap ☆ on any fixture to save it here, and see your own custom itinerary
                </p>
            ) : (
                <>
                    <TripBox trip={trip} />
                    <div className={styles.shortlistActions}>
                        <button
                            type="button"
                            className={styles.chip}
                            onClick={() => downloadIcs(fixtures, 'footyplanner-shortlist.ics')}
                        >
                            Add all to calendar
                        </button>
                        <ClearButton linked={!!trip.link} onClear={clear} />
                    </div>
                    <Itinerary fixtures={fixtures} onToggle={onToggle} />
                </>
            )}
        </section>
    );
}
