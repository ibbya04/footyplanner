import { Fragment } from 'react';
import type { FixtureView } from '../browse/viewFixtures';
import { dateLabel } from '../browse/timeZones';
import { legs } from '../shortlist/itinerary';
import { FixtureCard } from './FixtureCard';
import { FixtureLinks } from './FixtureLinks';
import styles from './Sidebar.module.css';

interface Props {
    fixtures: FixtureView[];
    onToggle?: (id: string) => void;
}

export function Itinerary({ fixtures, onToggle }: Props) {
    const between = legs(fixtures);
    return (
        <ol className={styles.cards}>
            {fixtures.map((fixture, i) => {
                const leg = i > 0 ? between[i - 1] : null;
                const newDay = fixture.day !== fixtures[i - 1]?.day;
                return (
                    <Fragment key={fixture.id}>
                        {leg && (
                            <li role="presentation" className={leg.warning ? styles.legWarning : styles.leg}>
                                {leg.warning ? `⚠ ${leg.text}` : leg.text}
                            </li>
                        )}
                        {newDay && (
                            <li role="presentation">
                                <h3 className={styles.dayHead}>{dateLabel(fixture.day)}</h3>
                            </li>
                        )}
                        <FixtureCard fixture={fixture} saved {...(onToggle ? { onToggle } : {})}>
                            <FixtureLinks fixture={fixture} className={styles.cardLinks} />
                        </FixtureCard>
                    </Fragment>
                );
            })}
        </ol>
    );
}
