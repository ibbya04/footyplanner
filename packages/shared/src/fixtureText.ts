import type { Fixture } from './api';

const teamName = (team: Fixture['home']) => team?.shortName ?? team?.name ?? 'TBD';

export function fixtureTitle(fixture: Pick<Fixture, 'home' | 'away'>): string {
    return `${teamName(fixture.home)} v ${teamName(fixture.away)}`;
}

export function venueText(fixture: Pick<Fixture, 'venue'>): string | null {
    const { venue } = fixture;
    return venue ? [venue.name, venue.city].filter(Boolean).join(', ') : null;
}
