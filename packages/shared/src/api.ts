export interface TeamRef {
    id: string;
    name: string;
    shortName: string | null;
    abbreviation: string | null;
    crest: string | null;
}

export interface VenueRef {
    name: string;
    city: string | null;
    country: string | null;
    lat: number | null;
    lng: number | null;
    precision: 'stadium' | 'city' | null;
}

export interface Fixture {
    id: string;
    comp: string;
    kickoff: string;
    timeConfirmed: boolean;
    status: { state: 'pre' | 'in' | 'post'; name: string; detail: string | null };
    home: TeamRef | null;
    away: TeamRef | null;
    score: { home: number | null; away: number | null } | null;
    venue: VenueRef | null;
    neutral: boolean;
    url: string | null;
}

export interface FixturesResponse {
    from: string;
    to: string;
    fixtures: Fixture[];
}

export interface Competition {
    slug: string;
    name: string;
    short: string;
    group: { key: string; name: string; color: string };
    featured: boolean;
    tbc: { weeks: number; text: string; tv: boolean };
    logo: string | null;
}

export interface TripCreated {
    id: string;
    editToken: string;
}

export interface TripResponse {
    id: string;
    name: string | null;
    fixtures: Fixture[];
    missing: string[];
    updatedAt: string;
}

export interface CompetitionsResponse {
    competitions: Competition[];
}

export interface CompetitionStatus {
    slug: string;
    months: number;
    monthsFetched: number;
    lastOkAt: string | null;
    failingMonths: number;
    lastError: string | null;
}

export interface StatusResponse {
    now: string;
    lastRun: {
        startedAt: string;
        finishedAt: string;
        mode: 'sweep' | 'live';
        espnCalls: number;
        fixturesWritten: number;
        errors: string[];
    } | null;
    competitions: CompetitionStatus[];
    pending: { venues: number; crests: number };
}

export function venueKey(name: string, city: string, country: string): string {
    return `${name}|${city}|${country}`.toLowerCase();
}
