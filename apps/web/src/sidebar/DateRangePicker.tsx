import { useState } from 'react';
import { calendarMonth, monthOf, pickDay, rangeLabel, shiftMonth } from '../browse/calendar';
import { fitRange, MAX_RANGE_DAYS } from '../browse/urlFilters';
import { type DateRange, nextDays, thisWeekend } from '../dates';
import { Popover } from './Popover';
import styles from './Sidebar.module.css';

interface Props {
    range: DateRange;
    today: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onChange: (range: DateRange) => void;
}

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function presets(today: string): [string, string, DateRange][] {
    return [
        ['This weekend', 'This weekend (Fri–Sun)', thisWeekend(today)],
        ['7 days', 'Today and the next 6 days', nextDays(today, 7)],
        ['14 days', 'Today and the next 13 days', nextDays(today, 14)],
        ['30 days', 'Today and the next 29 days', nextDays(today, 30)],
    ];
}

function CalendarIcon() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M8 3v4M16 3v4M3 10h18" />
        </svg>
    );
}

function Calendar({ range, today, onPick }: { range: DateRange; today: string; onPick: (range: DateRange) => void }) {
    const [month, setMonth] = useState(() => monthOf(range.from));
    const [anchor, setAnchor] = useState<string | null>(null);
    const [hover, setHover] = useState<string | null>(null);
    const view = calendarMonth({ month, range, anchor, hover, today });

    const pick = (day: string) => {
        const next = pickDay(anchor, day);
        if ('anchor' in next) setAnchor(next.anchor);
        else onPick(fitRange(next.range.from, next.range.to));
    };

    return (
        <div className={styles.calendar}>
            <div className={styles.calHead}>
                <button
                    type="button"
                    className={styles.calNav}
                    aria-label="Previous month"
                    onClick={() => setMonth(shiftMonth(month, -1))}
                >
                    ‹
                </button>
                <span>{view.title}</span>
                <button
                    type="button"
                    className={styles.calNav}
                    aria-label="Next month"
                    onClick={() => setMonth(shiftMonth(month, 1))}
                >
                    ›
                </button>
            </div>
            <div className={styles.calGrid}>
                {WEEKDAYS.map(d => (
                    <span key={d} className={styles.calWeekday}>
                        {d}
                    </span>
                ))}
                {Array.from({ length: view.blanks }, (_, i) => (
                    <span key={`blank-${i}`} />
                ))}
                {view.days.map(d => (
                    <button
                        key={d.day}
                        type="button"
                        className={styles.calDay}
                        aria-label={d.label}
                        disabled={d.disabled}
                        data-in={d.inRange || undefined}
                        data-start={d.start || undefined}
                        data-end={d.end || undefined}
                        data-today={d.today || undefined}
                        onMouseEnter={() => anchor && setHover(d.day)}
                        onClick={() => pick(d.day)}
                    >
                        {d.date}
                    </button>
                ))}
            </div>
            <div className={styles.calHint}>
                {anchor ? `Now pick an end date (up to ${MAX_RANGE_DAYS} days)` : 'Pick a start date'}
            </div>
        </div>
    );
}

export function DateRangePicker({ range, today, open, onOpenChange, onChange }: Props) {
    const label = rangeLabel(range, today);
    const choose = (next: DateRange) => {
        onChange(next);
        onOpenChange(false);
    };

    return (
        <Popover
            label={`Dates: ${label.text}, ${label.days}`}
            title="Choose dates"
            open={open}
            onOpenChange={onOpenChange}
            trigger={
                <>
                    <CalendarIcon />
                    <span className={styles.triggerText}>
                        {label.text} <span className={styles.count}>{label.days}</span>
                    </span>
                </>
            }
        >
            <div className={styles.presets}>
                {presets(today).map(([name, title, preset]) => (
                    <button
                        key={name}
                        type="button"
                        className={styles.chip}
                        title={title}
                        aria-pressed={preset.from === range.from && preset.to === range.to}
                        onClick={() => choose(preset)}
                    >
                        {name}
                    </button>
                ))}
            </div>
            <Calendar range={range} today={today} onPick={choose} />
        </Popover>
    );
}
