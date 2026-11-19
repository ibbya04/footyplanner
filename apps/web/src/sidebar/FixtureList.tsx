import type { UrlFilters } from '../browse/urlFilters';
import type { FixtureView } from '../browse/viewFixtures';
import { dateLabel } from '../browse/timeZones';
import { FixtureCard } from './FixtureCard';
import styles from './Sidebar.module.css';

interface Props {
    fixtures: FixtureView[];
    filters: UrlFilters;
    loading: boolean;
}

function emptyMessage(filters: UrlFilters): string {
    if (filters.search.trim()) return `Nothing matches “${filters.search.trim()}”.`;
    if (filters.near) {
        return `No fixtures within ${filters.near.radius} km of ${filters.near.name}. Try a bigger distance or other dates.`;
    }
    if (filters.inView) return 'No fixtures in the visible map area. Zoom out or untick “Only fixtures in map view”.';
    return 'No fixtures in these dates for the selected competitions.';
}

function sections(fixtures: FixtureView[], filters: UrlFilters): [string, FixtureView[]][] {
    if (!filters.near || filters.sort !== 'distance') return byDay(fixtures);
    return fixtures.length ? [[`Nearest to ${filters.near.name}`, fixtures]] : [];
}

function byDay(fixtures: FixtureView[]): [string, FixtureView[]][] {
    const groups = new Map<string, FixtureView[]>();
    for (const fixture of fixtures) groups.set(fixture.day, [...(groups.get(fixture.day) ?? []), fixture]);
    return [...groups].map(([day, group]) => [dateLabel(day), group]);
}

export function FixtureList({ fixtures, filters, loading }: Props) {
    return (
        <section className={styles.list} aria-label="Fixtures">
            {!fixtures.length && !loading && <p className={styles.empty}>{emptyMessage(filters)}</p>}
            {sections(fixtures, filters).map(([heading, group]) => (
                <div key={heading} className={styles.dayGroup}>
                    <h3 className={styles.dayHead}>
                        <span>{heading}</span>
                        <span>{group.length}</span>
                    </h3>
                    <ol className={styles.cards}>
                        {group.map(fixture => (
                            <FixtureCard key={fixture.id} fixture={fixture} />
                        ))}
                    </ol>
                </div>
            ))}
        </section>
    );
}
