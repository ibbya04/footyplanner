import { MAX_RANGE_DAYS } from '../browse/urlFilters';
import { addDays, type DateRange, nextDays, thisWeekend } from '../dates';
import styles from './Sidebar.module.css';

interface Props {
    range: DateRange;
    today: string;
    onChange: (range: DateRange) => void;
}

function presets(today: string): [string, DateRange][] {
    return [
        ['This weekend', thisWeekend(today)],
        ['7 days', nextDays(today, 7)],
        ['14 days', nextDays(today, 14)],
        ['30 days', nextDays(today, 30)],
    ];
}

function fitTo(from: string, to: string): DateRange {
    const last = addDays(from, MAX_RANGE_DAYS - 1);
    return { from, to: to < from ? from : to > last ? last : to };
}

export function DateRangePicker({ range, today, onChange }: Props) {
    return (
        <section className={styles.dates}>
            <div className={styles.dateFields}>
                <label>
                    From
                    <input
                        type="date"
                        value={range.from}
                        onChange={e => e.target.value && onChange(fitTo(e.target.value, range.to))}
                    />
                </label>
                <label>
                    To
                    <input
                        type="date"
                        value={range.to}
                        min={range.from}
                        max={addDays(range.from, MAX_RANGE_DAYS - 1)}
                        onChange={e => e.target.value && onChange(fitTo(range.from, e.target.value))}
                    />
                </label>
            </div>
            <div className={styles.presets}>
                {presets(today).map(([label, preset]) => (
                    <button
                        key={label}
                        type="button"
                        className={styles.chip}
                        aria-pressed={preset.from === range.from && preset.to === range.to}
                        onClick={() => onChange(preset)}
                    >
                        {label}
                    </button>
                ))}
            </div>
        </section>
    );
}
