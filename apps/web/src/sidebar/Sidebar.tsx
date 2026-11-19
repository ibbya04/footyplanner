import type { Competition } from '@footyplanner/shared';
import type { UpdateFilters } from '../browse/useFilters';
import type { UrlFilters } from '../browse/urlFilters';
import type { FixturesView } from '../browse/viewFixtures';
import { CompetitionPicker } from './CompetitionPicker';
import { DataUpdated } from './DataUpdated';
import { DateRangePicker } from './DateRangePicker';
import { DayChips } from './DayChips';
import { FixtureCard } from './FixtureCard';
import { ListTools } from './ListTools';
import styles from './Sidebar.module.css';

interface Props {
    competitions: Competition[];
    filters: UrlFilters;
    update: UpdateFilters;
    view: FixturesView;
    status: string;
    today: string;
}

export function Sidebar({ competitions, filters, update, view, status, today }: Props) {
    return (
        <aside className={styles.sidebar}>
            <header className={styles.brand}>
                <h1>
                    footy<span>planner</span>
                </h1>
                <span className={styles.status} role="status">
                    {status}
                </span>
                <DataUpdated />
            </header>
            <DateRangePicker range={filters.range} today={today} onChange={range => update({ range, day: null })} />
            <CompetitionPicker
                competitions={competitions}
                chosen={filters.comps}
                onChange={comps => update({ comps, day: null })}
            />
            <ListTools filters={filters} update={update} />
            <DayChips days={view.days} selected={filters.day} onSelect={day => update({ day })} />
            <ol className={styles.list} aria-label="Fixtures">
                {view.fixtures.map(fixture => (
                    <FixtureCard key={fixture.id} fixture={fixture} />
                ))}
            </ol>
        </aside>
    );
}
