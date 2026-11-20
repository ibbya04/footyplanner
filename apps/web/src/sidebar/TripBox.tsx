import { tripLinks } from '../trips/link';
import type { SavedTrip, SaveStatus } from '../trips/useSavedTrip';
import styles from './Sidebar.module.css';

const STATUS_TEXT: Record<SaveStatus, string> = {
    saving: 'Saving…',
    saved: 'Saved',
    retrying: 'Not saved, retrying',
};

function CopyField({ label, value, hint }: { label: string; value: string; hint: string }) {
    return (
        <label className={styles.tripField}>
            <span>{label}</span>
            <span className={styles.tripCopy}>
                <input type="text" readOnly value={value} onFocus={e => e.currentTarget.select()} />
                <button
                    type="button"
                    className={styles.chip}
                    onClick={() => void navigator.clipboard?.writeText(value).catch(() => undefined)}
                >
                    Copy
                </button>
            </span>
            <small>{hint}</small>
        </label>
    );
}

export function TripBox({ trip }: { trip: SavedTrip }) {
    const { link } = trip;
    if (!link) {
        return (
            <section className={styles.tripBox} aria-label="Saved trip">
                <button type="button" className={styles.chip} onClick={trip.save} disabled={trip.creating}>
                    {trip.creating ? 'Saving…' : 'Save trip'}
                </button>
                <span className={styles.tripHint}>
                    {trip.error ?? 'Get a link to share and a calendar that follows kick-off changes.'}
                </span>
            </section>
        );
    }
    const links = tripLinks(window.location.origin, link.id, link.editToken);
    return (
        <section className={styles.tripBox} aria-label="Saved trip">
            <div className={styles.tripHead}>
                <label className={styles.tripName}>
                    <span>Trip name</span>
                    <input
                        type="text"
                        maxLength={60}
                        placeholder="Untitled trip"
                        value={trip.name}
                        onChange={e => trip.rename(e.target.value)}
                    />
                </label>
                <span className={styles.tripStatus} role="status">
                    {trip.status && STATUS_TEXT[trip.status]}
                </span>
            </div>
            <CopyField label="Link to share" value={links.page} hint="Anyone with it can see the trip." />
            <CopyField
                label="Edit link"
                value={links.edit}
                hint="Keep it private: it lets you edit this trip from another browser."
            />
            <a className={styles.chip} href={links.subscribe}>
                Subscribe in calendar
            </a>
        </section>
    );
}
