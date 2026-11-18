// Decides which fixtures need writing and which changes are worth recording. Pure: no I/O.
// Writing only what changed keeps ingestion inside D1's Free-plan limit of 100k rows written a day.
import type { FixtureInput } from './parse';

export interface StoredFixture extends FixtureInput {
    removedAt: number | null;
}

export interface FixtureChange {
    fixtureId: string;
    kind: 'kickoff' | 'confirmed' | 'status';
    before: string | null;
    after: string | null;
}

// Statuses that change whether a match is going ahead.
const NOTABLE_STATUS = new Set(['STATUS_POSTPONED', 'STATUS_CANCELED', 'STATUS_ABANDONED', 'STATUS_SUSPENDED']);

const COMPARED: (keyof FixtureInput)[] = [
    'comp',
    'kickoff',
    'timeValid',
    'state',
    'statusName',
    'statusDetail',
    'homeTeamId',
    'awayTeamId',
    'homeScore',
    'awayScore',
    'venueKey',
    'neutralSite',
    'summaryUrl',
];

export function diffFixtures(
    stored: Map<string, StoredFixture>,
    incoming: FixtureInput[],
): { writes: FixtureInput[]; changes: FixtureChange[] } {
    const writes: FixtureInput[] = [];
    const changes: FixtureChange[] = [];
    for (const next of incoming) {
        const prev = stored.get(next.id);
        if (!prev) {
            writes.push(next);
            continue;
        }
        if (prev.removedAt !== null || COMPARED.some(k => prev[k] !== next[k])) writes.push(next);
        if (prev.kickoff !== next.kickoff) {
            changes.push({ fixtureId: next.id, kind: 'kickoff', before: prev.kickoff, after: next.kickoff });
        }
        if (!prev.timeValid && next.timeValid) {
            changes.push({ fixtureId: next.id, kind: 'confirmed', before: null, after: next.kickoff });
        }
        if (
            prev.statusName !== next.statusName &&
            (NOTABLE_STATUS.has(next.statusName) || NOTABLE_STATUS.has(prev.statusName))
        ) {
            changes.push({ fixtureId: next.id, kind: 'status', before: prev.statusName, after: next.statusName });
        }
    }
    return { writes, changes };
}
