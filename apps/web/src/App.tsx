import type { Competition } from '@footyplanner/shared';
import { type CSSProperties, useCallback, useMemo, useState } from 'react';
import { useCompetitions, useFixtures } from './api/queries';
import styles from './App.module.css';
import { useFilters } from './browse/useFilters';
import { type Area, viewFixtures, viewShortlist } from './browse/viewFixtures';
import { localToday, myZone } from './dates';
import { FixtureMap } from './map/FixtureMap';
import { ResizeHandle } from './sidebar/ResizeHandle';
import { Sidebar, type Tab } from './sidebar/Sidebar';
import { useSidebarWidth } from './sidebar/useSidebarWidth';
import { useShortlist } from './shortlist/useShortlist';
import { EditHandoff } from './trips/EditHandoff';
import { openRoute, type Route } from './trips/route';
import { TripPage } from './trips/TripPage';
import { useSavedTrip } from './trips/useSavedTrip';

function Planner({ competitions, initialTab }: { competitions: Competition[]; initialTab: Tab }) {
    const today = localToday();
    const slugs = useMemo(() => competitions.map(c => c.slug), [competitions]);
    const [filters, updateFilters] = useFilters(slugs, today);
    const fixtures = useFixtures(filters.range);
    const [area, setArea] = useState<Area | null>(null);
    const sidebar = useSidebarWidth();
    const [tab, setTab] = useState<Tab>(initialTab);
    const shortlist = useShortlist(fixtures.data?.fixtures);
    const trip = useSavedTrip(shortlist.saved);
    const view = useMemo(
        () =>
            viewFixtures(
                fixtures.data?.fixtures ?? [],
                competitions,
                { ...filters, area: filters.inView ? area : null },
                { today, myZone },
            ),
        [fixtures.data, competitions, filters, area, today],
    );
    const savedViews = useMemo(
        () => viewShortlist(shortlist.saved, competitions, filters, { today, myZone }),
        [shortlist.saved, competitions, filters, today],
    );
    const onShortlist = tab === 'shortlist';
    const statusLine = fixtures.error
        ? `Couldn't load fixtures: ${fixtures.error.message}`
        : fixtures.isSuccess
          ? `${view.fixtures.length} fixtures`
          : 'Loading fixtures…';

    return (
        <main className={styles.app} style={{ '--sidebar': `${sidebar.width}px` } as CSSProperties}>
            <Sidebar
                competitions={competitions}
                filters={filters}
                updateFilters={updateFilters}
                view={view}
                statusLine={statusLine}
                today={today}
                loading={fixtures.isPending}
                mapCentre={area && { lat: (area.south + area.north) / 2, lng: (area.west + area.east) / 2 }}
                tab={tab}
                onTab={setTab}
                shortlist={shortlist}
                savedViews={savedViews}
                trip={trip}
            />
            <ResizeHandle {...sidebar} />
            <div className={styles.mapWrap}>
                <FixtureMap
                    competitions={competitions}
                    fixtures={onShortlist ? savedViews : view.fixtures}
                    near={filters.near}
                    onAreaChange={setArea}
                    savedIds={shortlist.savedIds}
                    onToggle={shortlist.toggle}
                    route={onShortlist ? savedViews : null}
                />
            </div>
        </main>
    );
}

export function App() {
    const competitions = useCompetitions();
    const [route, setRoute] = useState<Route>(() => openRoute(window.location, window.history));
    const openShortlist = useCallback(() => {
        window.history.pushState(null, '', '/');
        setRoute({ kind: 'planner', tab: 'shortlist' });
    }, []);
    const editing = useCallback(() => {
        window.history.replaceState(null, '', '/');
        setRoute({ kind: 'planner', tab: 'shortlist' });
    }, []);

    if (competitions.error) {
        return <p role="status">Couldn&apos;t load competitions: {competitions.error.message}</p>;
    }
    if (route.kind === 'handoff') {
        return (
            <EditHandoff
                id={route.id}
                editToken={route.editToken}
                onEditing={editing}
                onViewOnly={() => setRoute({ kind: 'trip', id: route.id })}
            />
        );
    }
    if (!competitions.data) return <p role="status">Loading…</p>;
    if (route.kind === 'trip') {
        return <TripPage id={route.id} competitions={competitions.data.competitions} onOpenShortlist={openShortlist} />;
    }
    return <Planner competitions={competitions.data.competitions} initialTab={route.tab} />;
}
