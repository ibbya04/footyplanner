// Types and trimming for ESPN's unofficial soccer scoreboard API.
// Only the fields the page reads are typed; ESPN sends far more.

export interface EspnLogo {
    href?: string;
    rel?: string[];
}

export interface EspnTeam {
    displayName?: string;
    name?: string;
    shortDisplayName?: string;
    abbreviation?: string;
    logo?: string;
    logos?: EspnLogo[];
}

export interface EspnCompetitor {
    homeAway?: 'home' | 'away';
    score?: string;
    winner?: boolean;
    team?: EspnTeam;
}

export interface EspnVenue {
    fullName?: string;
    displayName?: string;
    address?: { city?: string; country?: string };
}

export interface EspnStatusType {
    state?: string;
    name?: string;
    shortDetail?: string;
    detail?: string;
}

export interface EspnLink {
    rel?: string[];
    href?: string;
}

export interface EspnEvent {
    id: string;
    date?: string;
    timeValid?: boolean;
    status?: { type?: EspnStatusType };
    links?: EspnLink[];
    competitions?: {
        date?: string;
        timeValid?: boolean;
        neutralSite?: boolean;
        venue?: EspnVenue;
        competitors?: EspnCompetitor[];
    }[];
}

export interface EspnLeague {
    logo?: string;
    logos?: EspnLogo[];
}

export interface EspnScoreboard {
    leagues?: EspnLeague[];
    events?: EspnEvent[];
}

const hasRel = (l: { rel?: string[] }, rel: string) => (l.rel ?? []).includes(rel);

// Keep only the fields the page uses (mirrors slimEvent in apps/web/legacy/index.html).
export function slimEvent(ev: EspnEvent): EspnEvent {
    const c = ev.competitions?.[0] ?? {};
    const team = (t: EspnTeam | undefined): EspnTeam | undefined =>
        t && {
            displayName: t.displayName,
            name: t.name,
            shortDisplayName: t.shortDisplayName,
            abbreviation: t.abbreviation,
            logo: t.logo || t.logos?.[0]?.href,
        };
    const type = ev.status?.type;
    return {
        id: ev.id,
        date: ev.date,
        timeValid: ev.timeValid,
        status: type
            ? { type: { state: type.state, name: type.name, shortDetail: type.shortDetail, detail: type.detail } }
            : undefined,
        links: (ev.links ?? [])
            .filter(l => hasRel(l, 'summary'))
            .slice(0, 1)
            .map(l => ({ rel: l.rel, href: l.href })),
        competitions: [
            {
                date: c.date,
                timeValid: c.timeValid,
                neutralSite: c.neutralSite,
                venue: c.venue && {
                    fullName: c.venue.fullName,
                    displayName: c.venue.displayName,
                    address: c.venue.address && { city: c.venue.address.city, country: c.venue.address.country },
                },
                competitors: (c.competitors ?? []).map(t => ({
                    homeAway: t.homeAway,
                    score: t.score,
                    winner: t.winner,
                    team: team(t.team),
                })),
            },
        ],
    };
}

// The league's light-background logo, falling back to whatever ESPN offers.
export function leagueLogo(leagues: EspnLeague[] | undefined): string | null {
    const league = leagues?.[0];
    if (!league) return null;
    const logos = league.logos ?? [];
    const pick = logos.find(l => hasRel(l, 'default') && !hasRel(l, 'dark')) ?? logos[0];
    return pick?.href || league.logo || null;
}
