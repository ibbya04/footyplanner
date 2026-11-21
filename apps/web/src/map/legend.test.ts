import type { Competition } from '@footyplanner/shared';
import { describe, expect, it } from 'vitest';
import { legendGroups } from './legend';

function competition(slug: string, key: string, name: string, color: string): Competition {
    return {
        slug,
        name: slug,
        short: slug,
        group: { key, name, color },
        featured: true,
        tbc: { weeks: 4, text: 'a month before', tv: false },
        logo: null,
    };
}

const championsLeague = competition('uefa.champions', 'uefa', 'UEFA', '#06b6d4');
const premierLeague = competition('eng.1', 'eng', 'England', '#a855f7');
const championship = competition('eng.2', 'eng', 'England', '#a855f7');
const laLiga = competition('esp.1', 'esp', 'Spain', '#f59e0b');
const competitions = [championsLeague, premierLeague, championship, laLiga];

describe('map legend', () => {
    it('lists each group with fixtures shown once, in the order competitions are listed', () => {
        const shown = [laLiga, premierLeague, championship, laLiga].map(c => ({ competition: c }));

        expect(legendGroups(competitions, shown)).toEqual([
            { key: 'eng', name: 'England', color: '#a855f7' },
            { key: 'esp', name: 'Spain', color: '#f59e0b' },
        ]);
    });

    it('is empty when no fixtures are shown', () => {
        expect(legendGroups(competitions, [])).toEqual([]);
    });
});
