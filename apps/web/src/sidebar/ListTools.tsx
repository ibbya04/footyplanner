import type { UpdateFilters } from '../browse/useFilters';
import type { UrlFilters } from '../browse/urlFilters';
import styles from './Sidebar.module.css';

interface Props {
    filters: UrlFilters;
    update: UpdateFilters;
}

export function ListTools({ filters, update }: Props) {
    return (
        <section className={styles.tools}>
            <input
                type="search"
                className={styles.search}
                aria-label="Search fixtures"
                placeholder="Search teams, venues, competitions"
                value={filters.search}
                onChange={e => update({ search: e.target.value, day: null })}
            />
            <label className={styles.inView}>
                <input type="checkbox" checked={filters.inView} onChange={e => update({ inView: e.target.checked })} />
                Only fixtures in map view
            </label>
            <fieldset className={styles.zones}>
                <legend>Kick-off times</legend>
                <label>
                    <input
                        type="radio"
                        name="zone"
                        checked={filters.timeZone === 'venue'}
                        onChange={() => update({ timeZone: 'venue', day: null })}
                    />
                    Venue time
                </label>
                <label>
                    <input
                        type="radio"
                        name="zone"
                        checked={filters.timeZone === 'mine'}
                        onChange={() => update({ timeZone: 'mine', day: null })}
                    />
                    My time
                </label>
            </fieldset>
        </section>
    );
}
