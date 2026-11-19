import { useMemo } from 'react';
import { useCompetitions, useFixtures } from './api/queries';
import styles from './App.module.css';
import { nextDays } from './dates';
import { FixtureMap } from './map/FixtureMap';

const RANGE = nextDays(7);

export function App() {
    const competitions = useCompetitions();
    const bySlug = useMemo(
        () => new Map((competitions.data?.competitions ?? []).map(c => [c.slug, c])),
        [competitions.data],
    );
    const fixtures = useFixtures(RANGE, [...bySlug.keys()]);
    const list = fixtures.data?.fixtures ?? [];
    const failed = competitions.error ?? fixtures.error;

    return (
        <main className={styles.app}>
            <FixtureMap fixtures={list} competitions={bySlug} />
            <header className={styles.bar}>
                <h1 className={styles.brand}>
                    footy<span>planner</span>
                </h1>
                <span className={styles.status} role="status">
                    {failed
                        ? `Couldn't load fixtures: ${failed.message}`
                        : fixtures.isSuccess
                          ? `${list.length} matches in the next 7 days`
                          : 'Loading fixtures…'}
                </span>
            </header>
        </main>
    );
}
