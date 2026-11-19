import type { Competition } from '@footyplanner/shared';
import type { UpdateFilters } from '../browse/useFilters';
import type { UrlFilters } from '../browse/urlFilters';
import type { FixturesView } from '../browse/viewFixtures';
import { CompetitionPicker } from './CompetitionPicker';
import { DataUpdated } from './DataUpdated';
import { DateRangePicker } from './DateRangePicker';
import { DayChips } from './DayChips';
import { FixtureList } from './FixtureList';
import { ListTools } from './ListTools';
import styles from './Sidebar.module.css';

interface Props {
    competitions: Competition[];
    filters: UrlFilters;
    updateFilters: UpdateFilters;
    view: FixturesView;
    statusLine: string;
    today: string;
    loading: boolean;
}

export function Sidebar({ competitions, filters, updateFilters, view, statusLine, today, loading }: Props) {
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
            <DateRangePicker
                range={filters.range}
                today={today}
                onChange={range => updateFilters({ range, day: null })}
            />
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
