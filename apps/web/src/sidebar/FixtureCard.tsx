import type { CSSProperties, ReactNode } from 'react';
import type { FixtureView } from '../browse/viewFixtures';
import styles from './Sidebar.module.css';
import { StarButton } from './StarButton';

function scoreText(fixture: FixtureView): string | null {
    if (fixture.status.state === 'pre' || !fixture.score) return null;
    return `${fixture.score.home ?? '–'}–${fixture.score.away ?? '–'}`;
}

interface Props {
    fixture: FixtureView;
    saved: boolean;
    onToggle: (id: string) => void;
    children?: ReactNode;
}

export function FixtureCard({ fixture, saved, onToggle, children }: Props) {
    const { competition } = fixture;
    const score = scoreText(fixture);
    return (
        <li className={styles.card} style={{ '--c': competition.group.color } as CSSProperties}>
            <div className={styles.cardHead}>
                <span className={styles.compTag} title={competition.name}>
                    {competition.short}
                </span>
                <span className={styles.when}>{fixture.kickoffText}</span>
                {fixture.status.state === 'in' && (
                    <span className={styles.live}>{fixture.status.detail ?? 'Live'}</span>
                )}
                <StarButton title={fixture.title} saved={saved} onToggle={() => onToggle(fixture.id)} />
            </div>
            <div className={styles.teams}>
                {fixture.title}
                {score && <span className={styles.score}>{score}</span>}
            </div>
            {fixture.venueText && (
                <div className={styles.venue}>
                    {fixture.venueText}
                    {fixture.approximate && (
                        <span
                            className={styles.approx}
                            title="Pinned to the city centre; the ground hasn't been located"
                        >
                            {' '}
                            · Location approximate
                        </span>
                    )}
                </div>
            )}
            {fixture.distanceText && (
                <div className={styles.distance} title="Straight-line distance; travel time is a rough estimate">
                    {fixture.distanceText}
                </div>
            )}
            {fixture.tbc && (
                <div className={styles.tbc} title={fixture.tbc.long}>
                    {fixture.tbc.short}
                </div>
            )}
            {children}
        </li>
    );
}
