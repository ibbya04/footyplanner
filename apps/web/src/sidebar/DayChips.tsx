import type { DayCount } from '../browse/viewFixtures';
import styles from './Sidebar.module.css';

interface Props {
    days: DayCount[];
    selected: string | null;
    onSelect: (day: string | null) => void;
}

export function DayChips({ days, selected, onSelect }: Props) {
    return (
        <nav className={styles.days} aria-label="Days">
            {days.map(({ day, label, count }) => {
                const on = day === selected;
                return (
                    <button
                        key={day}
                        type="button"
                        className={styles.chip}
                        aria-pressed={on}
                        onClick={() => onSelect(on ? null : day)}
                    >
                        {label} <span className={styles.count}>{count}</span>
                    </button>
                );
            })}
        </nav>
    );
}
