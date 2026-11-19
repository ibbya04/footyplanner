import { Fragment, useState } from 'react';
import type { FixtureView } from '../browse/viewFixtures';
import { dateLabel } from '../browse/timeZones';
import { downloadIcs } from '../shortlist/download';
import { legs } from '../shortlist/itinerary';
import { FixtureCard } from './FixtureCard';
import { FixtureLinks } from './FixtureLinks';
import styles from './Sidebar.module.css';

interface Props {
    fixtures: FixtureView[];
    onToggle: (id: string) => void;
    onClear: () => void;
}

function ClearButton({ onClear }: { onClear: () => void }) {
    const [confirming, setConfirming] = useState(false);
    if (!confirming) {
        return (
            <button type="button" className={styles.chip} onClick={() => setConfirming(true)}>
                Clear
            </button>
        );
    }
    return (
        <span className={styles.confirm}>
            <button type="button" className={styles.chip} onClick={onClear}>
                Remove all
            </button>
            <button type="button" className={styles.chip} onClick={() => setConfirming(false)}>
                Keep
            </button>
        </span>
    );
}

export function ShortlistPanel({ fixtures, onToggle, onClear }: Props) {
    const between = legs(fixtures);
    return (
        <section className={styles.list} aria-label="Shortlist">
            {!fixtures.length ? (
                <p className={styles.empty}>
                    <strong>Your shortlist is empty</strong>
                    <br />
                    Tap ☆ on any fixture to save it here for an itinerary with travel times, clash warnings and a
                    calendar export.
                </p>
            ) : (
                <>
                    <div className={styles.shortlistActions}>
                        <button
                            type="button"
                            className={styles.chip}
                            onClick={() => downloadIcs(fixtures, 'footyplanner-shortlist.ics')}
                        >
                            Add all to calendar
                        </button>
                        <ClearButton onClear={onClear} />
                    </div>
                    <ol className={styles.cards}>
                        {fixtures.map((fixture, i) => {
                            const leg = i > 0 ? between[i - 1] : null;
                            const newDay = fixture.day !== fixtures[i - 1]?.day;
                            return (
                                <Fragment key={fixture.id}>
                                    {leg && (
                                        <li
                                            role="presentation"
                                            className={leg.warning ? styles.legWarning : styles.leg}
                                        >
                                            {leg.warning ? `⚠ ${leg.text}` : leg.text}
                                        </li>
                                    )}
                                    {newDay && (
                                        <li role="presentation">
                                            <h3 className={styles.dayHead}>{dateLabel(fixture.day)}</h3>
                                        </li>
                                    )}
                                    <FixtureCard fixture={fixture} saved onToggle={onToggle}>
                                        <FixtureLinks fixture={fixture} className={styles.cardLinks} />
                                    </FixtureCard>
                                </Fragment>
                            );
                        })}
                    </ol>
                </>
            )}
        </section>
    );
}
