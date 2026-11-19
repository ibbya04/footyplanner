import type { CSSProperties } from 'react';
import type { FixtureView } from '../browse/viewFixtures';
import styles from './Sidebar.module.css';

function scoreText(fixture: FixtureView): string | null {
    if (fixture.status.state === 'pre' || !fixture.score) return null;
    return `${fixture.score.home ?? '–'}–${fixture.score.away ?? '–'}`;
}

export function FixtureCard({ fixture }: { fixture: FixtureView }) {
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
            {fixture.tbc && (
                <div className={styles.tbc} title={fixture.tbc.long}>
                    {fixture.tbc.short}
                </div>
            )}
        </li>
    );
}
