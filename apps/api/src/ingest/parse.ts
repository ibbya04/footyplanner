// Turns raw ESPN scoreboard events into database rows. Pure: no I/O.
// Mirrors normalizeEvent() in apps/web/legacy/index.html so both agree on ids, venues and status.
import { venueKey, type EspnCompetitor, type EspnEvent } from '@footyplanner/shared';

export interface TeamInput {
    id: string;
    name: string;
    shortName: string | null;
    abbreviation: string | null;
    crestUrl: string | null;
}

export interface VenueInput {
    key: string;
    espnId: string | null;
    name: string;
    city: string | null;
    country: string | null;
}

export interface FixtureInput {
    id: string;
    comp: string;
    kickoff: string;
    timeValid: boolean;
    state: string;
    statusName: string;
    statusDetail: string | null;
    homeTeamId: string | null;
    awayTeamId: string | null;
    homeScore: number | null;
    awayScore: number | null;
    venueKey: string | null;
    neutralSite: boolean;
    summaryUrl: string | null;
}

export interface ParsedEvent {
    fixture: FixtureInput;
    teams: TeamInput[];
    venue: VenueInput | null;
}

function team(t: EspnCompetitor | undefined): TeamInput | null {
    const raw = t?.team;
    if (!raw?.id) return null;
    return {
        id: raw.id,
        name: raw.displayName || raw.name || 'TBD',
        shortName: raw.shortDisplayName || null,
        abbreviation: raw.abbreviation || null,
        crestUrl: raw.logo || raw.logos?.[0]?.href || null,
    };
}

function score(t: EspnCompetitor | undefined, state: string): number | null {
    if (state === 'pre' || t?.score === undefined || t.score === '') return null;
    const n = Number(t.score);
    return Number.isFinite(n) ? n : null;
}

export function parseEvent(comp: string, ev: EspnEvent): ParsedEvent | null {
    const c = ev.competitions?.[0];
    if (!c || !Array.isArray(c.competitors)) return null;
    const home = c.competitors.find(t => t.homeAway === 'home') ?? c.competitors[0];
    const away = c.competitors.find(t => t.homeAway === 'away') ?? c.competitors[1];
    if (!home || !away) return null;

    const kickoff = new Date(c.date || ev.date || '');
    if (isNaN(kickoff.getTime())) return null;

    const type = ev.status?.type ?? c.status?.type ?? {};
    const state = type.state === 'in' || type.state === 'post' ? type.state : 'pre';
    const v = c.venue ?? ev.venue;
    const venueName = v?.fullName || v?.displayName || '';
    const city = v?.address?.city || '';
    const country = v?.address?.country || '';
    const link = (ev.links ?? []).find(l => (l.rel ?? []).includes('summary')) ?? ev.links?.[0];
    const homeTeam = team(home);
    const awayTeam = team(away);

    return {
        fixture: {
            id: `${comp}:${ev.id}`,
            comp,
            kickoff: kickoff.toISOString(),
            timeValid: c.timeValid !== false && ev.timeValid !== false,
            state,
            statusName: type.name || '',
            statusDetail: type.shortDetail || type.detail || null,
            homeTeamId: homeTeam?.id ?? null,
            awayTeamId: awayTeam?.id ?? null,
            homeScore: score(home, state),
            awayScore: score(away, state),
            venueKey: venueName || city ? venueKey(venueName, city, country) : null,
            neutralSite: c.neutralSite === true,
            summaryUrl: link?.href || null,
        },
        teams: [homeTeam, awayTeam].filter(t => t !== null),
        venue:
            venueName || city
                ? {
                      key: venueKey(venueName, city, country),
                      espnId: v?.id || null,
                      name: venueName || city,
                      city: city || null,
                      country: country || null,
                  }
                : null,
    };
}
