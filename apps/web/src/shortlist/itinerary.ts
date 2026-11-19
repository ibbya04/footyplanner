import { distanceKm, type Fixture, formatMinutes, type Point, travelLabel, travelMinutes } from '@footyplanner/shared';

export interface Leg {
    text: string;
    warning: boolean;
}

const MATCH_MINUTES = 120;
const SAME_TIME_MINUTES = 5;
const SPARE_MINUTES = 60;

const fine = (text: string): Leg => ({ text, warning: false });
const warn = (text: string): Leg => ({ text, warning: true });

function location(fixture: Fixture): Point | null {
    const lat = fixture.venue?.lat;
    const lng = fixture.venue?.lng;
    return lat == null || lng == null ? null : { lat, lng };
}

function leg(from: Fixture, to: Fixture): Leg | null {
    const a = location(from);
    const b = location(to);
    if (!a || !b) return null;
    const km = distanceKm(a, b);
    const travel = travelLabel(km);
    if (!from.timeConfirmed || !to.timeConfirmed) return fine(`${travel} · times not confirmed yet`);
    const gap = (Date.parse(to.kickoff) - Date.parse(from.kickoff)) / 60_000;
    return clash(gap, km, travel) ?? fine(travel);
}

function clash(gap: number, km: number, travel: string): Leg | null {
    if (gap < SAME_TIME_MINUTES) return warn('Same kick-off time: you can only see one of these');
    if (gap < MATCH_MINUTES) return warn(`Kick-offs overlap: only ${formatMinutes(Math.round(gap))} apart`);
    const afterWhistle = gap - MATCH_MINUTES;
    const spare = afterWhistle - (km < 1 ? 0 : travelMinutes(km));
    if (spare < 0) {
        return warn(
            `Can't make both: ${travel}, but only ${formatMinutes(Math.round(afterWhistle))} after the first final whistle`,
        );
    }
    if (spare < SPARE_MINUTES && km >= 1) return warn(`Tight: ${travel} with under an hour to spare`);
    return null;
}

export function legs(fixtures: Fixture[]): (Leg | null)[] {
    return fixtures.slice(1).map((to, i) => leg(fixtures[i] as Fixture, to));
}
