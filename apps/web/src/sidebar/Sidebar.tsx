import type { Competition, Point } from '@footyplanner/shared';
import { useState } from 'react';
import type { UpdateFilters } from '../browse/useFilters';
import type { UrlFilters } from '../browse/urlFilters';
import type { FixturesView } from '../browse/viewFixtures';
import { CompetitionPicker } from './CompetitionPicker';
import { DataUpdated } from './DataUpdated';
import { DateRangePicker } from './DateRangePicker';
import { DayChips } from './DayChips';
import { FixtureList } from './FixtureList';
import { ListTools } from './ListTools';
import { NearPicker } from './NearPicker';
import styles from './Sidebar.module.css';

interface Props {
    competitions: Competition[];
    filters: UrlFilters;
    updateFilters: UpdateFilters;
    view: FixturesView;
    statusLine: string;
    today: string;
    loading: boolean;
    mapCentre: Point | null;
}

type OpenPopover = 'dates' | 'near' | null;

export function Sidebar({ competitions, filters, updateFilters, view, statusLine, today, loading, mapCentre }: Props) {
    const [open, setOpen] = useState<OpenPopover>(null);
    const toggle = (name: Exclude<OpenPopover, null>) => (isOpen: boolean) =>
        setOpen(current => (isOpen ? name : current === name ? null : current));
    return (
        <aside className={styles.sidebar}>
            <header className={styles.brand}>
                <h1>
                    footy<span>planner</span>
                </h1>
                <span className={styles.status} role="status">
                    {statusLine}
                </span>
                <DataUpdated />
            </header>
            <div className={styles.trip}>
                <DateRangePicker
                    range={filters.range}
                    today={today}
                    open={open === 'dates'}
                    onOpenChange={toggle('dates')}
                    onChange={range => updateFilters({ range, day: null })}
                />
                <NearPicker
                    near={filters.near}
                    sort={filters.sort}
                    bias={mapCentre}
                    open={open === 'near'}
                    onOpenChange={toggle('near')}
                    onNear={near => updateFilters({ near })}
                    onSort={sort => updateFilters({ sort })}
                />
            </div>
            <CompetitionPicker
                competitions={competitions}
                chosen={filters.comps}
                onChange={comps => updateFilters({ comps, day: null })}
            />
            <ListTools filters={filters} updateFilters={updateFilters} />
            <DayChips days={view.days} selected={filters.day} onSelect={day => updateFilters({ day })} />
            <FixtureList fixtures={view.fixtures} filters={filters} loading={loading} />
        </aside>
    );
}
