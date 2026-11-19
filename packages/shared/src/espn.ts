export interface EspnLogo {
    href?: string;
    rel?: string[];
}

export interface EspnTeam {
    id?: string;
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
    id?: string;
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
        status?: { type?: EspnStatusType };
    }[];
    venue?: EspnVenue;
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

export function leagueLogo(leagues: EspnLeague[] | undefined): string | null {
    const league = leagues?.[0];
    if (!league) return null;
    const logos = league.logos ?? [];
    const pick = logos.find(l => hasRel(l, 'default') && !hasRel(l, 'dark')) ?? logos[0];
    return pick?.href || league.logo || null;
}
