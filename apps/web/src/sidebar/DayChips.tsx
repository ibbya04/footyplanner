import type { DayCount } from '../browse/viewFixtures';
import styles from './Sidebar.module.css';

interface Props {
    days: DayCount[];
    selected: string | null;
    onSelect: (day: string | null) => void;
}

export function DayChips({ days, selected, onSelect }: Props) {
    const current = days.some(d => d.day === selected) ? selected : null;
    if (days.length < 2 && !current) return null;
    return (
        <nav className={styles.days} aria-label="Days">
            <button type="button" className={styles.chip} aria-pressed={!current} onClick={() => onSelect(null)}>
                All days
            </button>
            {days.map(({ day, label, count }) => (
                <button
                    key={day}
                    type="button"
                    className={styles.chip}
                    aria-pressed={day === current}
                    onClick={() => onSelect(day === current ? null : day)}
                >
                    {label} <span className={styles.count}>{count}</span>
                </button>
            ))}
        </nav>
    );
}
