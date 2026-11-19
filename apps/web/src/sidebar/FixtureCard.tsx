import type { CSSProperties } from 'react';
import type { FixtureView } from '../browse/viewFixtures';
import { teamName } from '../teams';
import styles from './Sidebar.module.css';

function kickoffText({ kickoffAt }: FixtureView): string {
    if (!kickoffAt.time) return `${kickoffAt.date} · time TBC`;
    return `${kickoffAt.date} · ${kickoffAt.time} ${kickoffAt.zone}`;
}

function scoreText(fixture: FixtureView): string | null {
    if (fixture.status.state === 'pre' || !fixture.score) return null;
    return `${fixture.score.home ?? '–'}–${fixture.score.away ?? '–'}`;
}

export function FixtureCard({ fixture }: { fixture: FixtureView }) {
    const { competition, venue } = fixture;
    const score = scoreText(fixture);
    return (
        <li className={styles.card} style={{ '--c': competition.group.color } as CSSProperties}>
            <div className={styles.cardHead}>
                <span className={styles.compTag} title={competition.name}>
                    {competition.short}
                </span>
                <span className={styles.when}>{kickoffText(fixture)}</span>
                {fixture.status.state === 'in' && (
                    <span className={styles.live}>{fixture.status.detail ?? 'Live'}</span>
                )}
            </div>
            <div className={styles.teams}>
                {teamName(fixture.home)} v {teamName(fixture.away)}
                {score && <span className={styles.score}>{score}</span>}
            </div>
            {venue && (
                <div className={styles.venue}>
                    {[venue.name, venue.city].filter(Boolean).join(', ')}
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
