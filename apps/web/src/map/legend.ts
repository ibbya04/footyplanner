import type { Competition } from '@footyplanner/shared';

export type LegendGroup = Competition['group'];

export function legendGroups(competitions: Competition[], shown: { competition: Competition }[]): LegendGroup[] {
    const used = new Set(shown.map(fixture => fixture.competition.group.key));
    const groups = new Map<string, LegendGroup>();
    for (const { group } of competitions) {
        if (used.has(group.key) && !groups.has(group.key)) groups.set(group.key, group);
    }
    return [...groups.values()];
}
