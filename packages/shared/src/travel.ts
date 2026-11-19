export const FLY_KM = 600;
const AIRPORT_MINUTES = 180;
const FLIGHT_KMH = 750;
const ROAD_FACTOR = 1.3;

export function distLabel(km: number): string {
    return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
}

function roadSpeed(roadKm: number): number {
    if (roadKm < 40) return 40;
    return roadKm < 150 ? 70 : 90;
}

export function driveMinutes(km: number): number {
    const road = km * ROAD_FACTOR;
    return Math.max(5, Math.round(((road / roadSpeed(road)) * 60) / 5) * 5);
}

function flyMinutes(km: number): number {
    return Math.round((AIRPORT_MINUTES + (km / FLIGHT_KMH) * 60) / 15) * 15;
}

export function travelMinutes(km: number): number {
    return km > FLY_KM ? flyMinutes(km) : driveMinutes(km);
}

export function formatMinutes(minutes: number): string {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

export function travelLabel(km: number): string {
    if (km < 1) return 'Same stadium';
    return km > FLY_KM
        ? `${distLabel(km)} · ≈${formatMinutes(flyMinutes(km))} door to door by air`
        : `${distLabel(km)} · ≈${formatMinutes(driveMinutes(km))} drive`;
}
