import type { Competition, TripResponse } from '@footyplanner/shared';
import { type CSSProperties, useMemo, useState } from 'react';
import { useTrip } from '../api/trips';
import styles from '../App.module.css';
import { browserStorage } from '../browserStorage';
import { type FixtureView, viewShortlist } from '../browse/viewFixtures';
import { localToday, myZone } from '../dates';
import { FixtureMap } from '../map/FixtureMap';
import { downloadIcs } from '../shortlist/download';
import { readShortlist, writeShortlist } from '../shortlist/store';
import { Itinerary } from '../sidebar/Itinerary';
import { ResizeHandle } from '../sidebar/ResizeHandle';
import sidebarStyles from '../sidebar/Sidebar.module.css';
import { useSidebarWidth } from '../sidebar/useSidebarWidth';
import { tripLinks } from './link';
import { forgetTripLink } from './store';

interface Props {
    id: string;
    competitions: Competition[];
    onOpenShortlist: () => void;
}

const NO_SAVED = new Set<string>();
const AT_THE_VENUE = { timeZone: 'venue', near: null } as const;

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

function CopyButton({ trip, onCopied }: { trip: TripResponse; onCopied: () => void }) {
    const [replacing, setReplacing] = useState<number | null>(null);
    const copy = () => {
        writeShortlist(browserStorage, trip.fixtures);
        forgetTripLink(browserStorage);
        onCopied();
    };
    const start = () => {
        const mine = readShortlist(browserStorage).length;
        if (mine) setReplacing(mine);
        else copy();
    };
    if (replacing === null) {
        return (
            <button type="button" className={sidebarStyles.chip} onClick={start}>
                Copy to my shortlist
            </button>
        );
    }
    return (
        <span className={sidebarStyles.confirm}>
            <span className={sidebarStyles.confirmText}>
                This replaces the {plural(replacing, 'fixture')} on your shortlist. A trip you saved stays as it was.
            </span>
            <button type="button" className={sidebarStyles.chip} onClick={copy}>
                Replace
            </button>
            <button type="button" className={sidebarStyles.chip} onClick={() => setReplacing(null)}>
                Keep mine
            </button>
        </span>
    );
}

interface ViewProps {
    trip: TripResponse;
    views: FixtureView[];
    onOpenShortlist: () => void;
}

function TripView({ trip, views, onOpenShortlist }: ViewProps) {
    const links = tripLinks(window.location.origin, trip.id, null);
    const missing = trip.missing.length;
    return (
        <section className={sidebarStyles.list} aria-label="Trip">
            <h2 className={sidebarStyles.tripTitle}>{trip.name ?? 'Shared trip'}</h2>
            <p className={sidebarStyles.tripHint}>
                {plural(views.length, 'fixture')}, with kick-offs as they are now.
                {missing > 0 &&
                    ` ${plural(missing, 'fixture')} ESPN no longer lists ${missing === 1 ? 'is' : 'are'} left out.`}
            </p>
            <div className={sidebarStyles.shortlistActions}>
                <a className={sidebarStyles.chip} href={links.subscribe}>
                    Subscribe in calendar
                </a>
                <button
                    type="button"
                    className={sidebarStyles.chip}
                    onClick={() => downloadIcs(views, 'footyplanner-trip.ics')}
                >
                    Add all to calendar
                </button>
                <CopyButton trip={trip} onCopied={onOpenShortlist} />
                <a className={sidebarStyles.chip} href="/">
                    Plan your own
                </a>
            </div>
            <Itinerary fixtures={views} />
        </section>
    );
}

export function TripPage({ id, competitions, onOpenShortlist }: Props) {
    const trip = useTrip(id);
    const sidebar = useSidebarWidth();
    const today = localToday();
    const views = useMemo(
        () => viewShortlist(trip.data?.fixtures ?? [], competitions, AT_THE_VENUE, { today, myZone }),
        [trip.data, competitions, today],
    );
    const status = trip.error ? `Couldn't load the trip: ${trip.error.message}` : trip.data ? '' : 'Loading trip…';
    return (
        <main className={styles.app} style={{ '--sidebar': `${sidebar.width}px` } as CSSProperties}>
            <aside className={sidebarStyles.sidebar}>
                <header className={sidebarStyles.brand}>
                    <h1>
                        footy<span>planner</span>
                    </h1>
                    <span className={sidebarStyles.status} role="status">
                        {status}
                    </span>
                </header>
                {trip.data && <TripView trip={trip.data} views={views} onOpenShortlist={onOpenShortlist} />}
            </aside>
            <ResizeHandle {...sidebar} />
            <div className={styles.mapWrap}>
                <FixtureMap
                    fixtures={views}
                    near={null}
                    onAreaChange={() => undefined}
                    savedIds={NO_SAVED}
                    route={views}
                />
            </div>
        </main>
    );
}
