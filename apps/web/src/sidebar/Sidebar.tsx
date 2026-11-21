import type { Competition, Point } from '@footyplanner/shared';
import { useState } from 'react';
import type { UpdateFilters } from '../browse/useFilters';
import type { UrlFilters } from '../browse/urlFilters';
import type { FixturesView, FixtureView } from '../browse/viewFixtures';
import type { Selection } from '../selection';
import type { Shortlist } from '../shortlist/useShortlist';
import type { SavedTrip } from '../trips/useSavedTrip';
import { CompetitionPicker } from './CompetitionPicker';
import { DataUpdated } from './DataUpdated';
import { DateRangePicker } from './DateRangePicker';
import { DayChips } from './DayChips';
import { FixtureList } from './FixtureList';
import { ListTools } from './ListTools';
import { NearPicker } from './NearPicker';
import { ShortlistPanel } from './ShortlistPanel';
import styles from './Sidebar.module.css';

export type Tab = 'fixtures' | 'shortlist';

interface Props {
    competitions: Competition[];
    filters: UrlFilters;
    updateFilters: UpdateFilters;
    view: FixturesView;
    statusLine: string;
    today: string;
    loading: boolean;
    mapCentre: Point | null;
    tab: Tab;
    onTab: (tab: Tab) => void;
    shortlist: Shortlist;
    savedViews: FixtureView[];
    trip: SavedTrip;
    selection: Selection | null;
    onSelect: (id: string) => void;
}

type OpenPopover = 'dates' | 'near' | null;

function Tabs({ tab, onTab, saved }: { tab: Tab; onTab: (tab: Tab) => void; saved: number }) {
    return (
        <div className={styles.tabs} role="tablist">
            <button
                type="button"
                role="tab"
                className={styles.tab}
                aria-selected={tab === 'fixtures'}
                onClick={() => onTab('fixtures')}
            >
                Fixtures
            </button>
            <button
                type="button"
                role="tab"
                className={styles.tab}
                aria-selected={tab === 'shortlist'}
                onClick={() => onTab('shortlist')}
            >
                ★ Shortlist {saved > 0 && <span className={styles.count}>{saved}</span>}
            </button>
        </div>
    );
}

export function Sidebar({
    competitions,
    filters,
    updateFilters,
    view,
    statusLine,
    today,
    loading,
    mapCentre,
    tab,
    onTab,
    shortlist,
    savedViews,
    trip,
    selection,
    onSelect,
}: Props) {
    const [open, setOpen] = useState<OpenPopover>(null);
    const toggle = (name: Exclude<OpenPopover, null>) => (isOpen: boolean) =>
        setOpen(current => (isOpen ? name : current === name ? null : current));
    return (
        <aside className={styles.sidebar}>
            <header className={styles.brand}>
                <h1>
                    footy<span>planner</span>
                </h1>
                <p className={styles.tagline}>See what matches are on across Europe and plan a trip around them.</p>
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
            <Tabs tab={tab} onTab={onTab} saved={shortlist.saved.length} />
            {tab === 'shortlist' ? (
                <ShortlistPanel
                    fixtures={savedViews}
                    trip={trip}
                    onToggle={shortlist.toggle}
                    onClear={shortlist.clear}
                    selection={selection}
                    onSelect={onSelect}
                />
            ) : (
                <>
                    <CompetitionPicker
                        competitions={competitions}
                        chosen={filters.comps}
                        onChange={comps => updateFilters({ comps, day: null })}
                    />
                    <ListTools filters={filters} updateFilters={updateFilters} />
                    <DayChips days={view.days} selected={filters.day} onSelect={day => updateFilters({ day })} />
                    <FixtureList
                        fixtures={view.fixtures}
                        filters={filters}
                        loading={loading}
                        savedIds={shortlist.savedIds}
                        onToggle={shortlist.toggle}
                        selection={selection}
                        onSelect={onSelect}
                    />
                </>
            )}
        </aside>
    );
}
