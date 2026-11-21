import { type CSSProperties, type MouseEvent, type ReactNode, useEffect, useRef } from 'react';
import type { FixtureView } from '../browse/viewFixtures';
import type { Selection } from '../selection';
import styles from './Sidebar.module.css';
import { StarButton } from './StarButton';

function scoreText(fixture: FixtureView): string | null {
    if (fixture.status.state === 'pre' || !fixture.score) return null;
    return `${fixture.score.home ?? '–'}–${fixture.score.away ?? '–'}`;
}

interface Props {
    fixture: FixtureView;
    saved: boolean;
    onToggle?: (id: string) => void;
    selection?: Selection | null;
    onSelect?: (id: string) => void;
    children?: ReactNode;
}

const onControl = (event: MouseEvent) => event.target instanceof Element && event.target.closest('a, button');

export function FixtureCard({ fixture, saved, onToggle, selection, onSelect, children }: Props) {
    const { competition } = fixture;
    const score = scoreText(fixture);
    const card = useRef<HTMLLIElement>(null);
    const selected = selection?.id === fixture.id;
    useEffect(() => {
        if (selected && selection?.source === 'map')
            card.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, [selected, selection]);
    return (
        <li
            ref={card}
            className={selected ? `${styles.card} ${styles.selected}` : styles.card}
            style={{ '--c': competition.group.color } as CSSProperties}
            aria-current={selected ? 'true' : undefined}
            onClick={event => onSelect && !onControl(event) && onSelect(fixture.id)}
        >
            <div className={styles.cardHead}>
                <span className={styles.compTag} title={competition.name}>
                    {competition.short}
                </span>
                <span className={styles.when}>{fixture.kickoffText}</span>
                {fixture.status.state === 'in' && (
                    <span className={styles.live}>{fixture.status.detail ?? 'Live'}</span>
                )}
                {onToggle && <StarButton title={fixture.title} saved={saved} onToggle={() => onToggle(fixture.id)} />}
            </div>
            <div className={styles.teams}>
                {onSelect ? (
                    <button
                        type="button"
                        className={styles.showOnMap}
                        aria-label={`Show ${fixture.title} on the map`}
                        onClick={() => onSelect(fixture.id)}
                    >
                        {fixture.title}
                    </button>
                ) : (
                    fixture.title
                )}
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
