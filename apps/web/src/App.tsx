import type { Competition } from '@footyplanner/shared';
import { type CSSProperties, useMemo, useState } from 'react';
import { useCompetitions, useFixtures } from './api/queries';
import styles from './App.module.css';
import { useFilters } from './browse/useFilters';
import { type Area, viewFixtures } from './browse/viewFixtures';
import { localToday, myZone } from './dates';
import { FixtureMap } from './map/FixtureMap';
import { ResizeHandle, useSidebarWidth } from './sidebar/ResizeHandle';
import { Sidebar } from './sidebar/Sidebar';

function Planner({ competitions }: { competitions: Competition[] }) {
    const today = localToday();
    const slugs = useMemo(() => competitions.map(c => c.slug), [competitions]);
    const [filters, update] = useFilters(slugs, today);
    const fixtures = useFixtures(filters.range, slugs);
    const [area, setArea] = useState<Area | null>(null);
    const [width, setWidth] = useSidebarWidth();
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
    const status = fixtures.error
        ? `Couldn't load fixtures: ${fixtures.error.message}`
        : fixtures.isSuccess
          ? `${view.fixtures.length} fixtures`
          : 'Loading fixtures…';

    return (
        <main className={styles.app} style={{ '--sidebar': `${width}px` } as CSSProperties}>
            <Sidebar
                competitions={competitions}
                filters={filters}
                update={update}
                view={view}
                status={status}
                today={today}
            />
            <ResizeHandle width={width} onResize={setWidth} />
            <div className={styles.mapWrap}>
                <FixtureMap fixtures={view.fixtures} onAreaChange={setArea} />
            </div>
        </main>
    );
}

export function App() {
    const competitions = useCompetitions();
    if (competitions.error) {
        return <p role="status">Couldn&apos;t load competitions: {competitions.error.message}</p>;
    }
    if (!competitions.data) return <p role="status">Loading…</p>;
    return <Planner competitions={competitions.data.competitions} />;
}
