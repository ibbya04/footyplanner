import { describe, expect, it } from 'vitest';
import { distLabel, driveMinutes, formatMinutes, travelLabel, travelMinutes } from '../src';

describe('distLabel', () => {
    it('shows one decimal under 10 km and whole kilometres above', () => {
        expect(distLabel(3.24)).toBe('3.2 km');
        expect(distLabel(9.96)).toBe('10.0 km');
        expect(distLabel(12.6)).toBe('13 km');
    });
});

describe('driveMinutes', () => {
    it('allows 40 km/h for short trips, rounded to 5 minutes, never under 5', () => {
        expect(driveMinutes(1)).toBe(5);
        expect(driveMinutes(20)).toBe(40);
    });

    it('allows 70 km/h on roads from 40 km and 90 km/h from 150 km', () => {
        expect(driveMinutes(50)).toBe(55);
        expect(driveMinutes(200)).toBe(175);
    });
});

describe('travelMinutes', () => {
    it('drives up to 600 km', () => {
        expect(travelMinutes(600)).toBe(520);
    });

    it('flies beyond 600 km: three hours door to door plus the flight at 750 km/h, rounded to 15 minutes', () => {
        expect(travelMinutes(601)).toBe(225);
        expect(travelMinutes(1500)).toBe(300);
    });
});

describe('formatMinutes', () => {
    it('shows minutes under an hour, then hours and minutes', () => {
        expect(formatMinutes(45)).toBe('45 min');
        expect(formatMinutes(60)).toBe('1h');
        expect(formatMinutes(135)).toBe('2h 15m');
    });
});

describe('travelLabel', () => {
    it('calls anything under 1 km the same stadium', () => {
        expect(travelLabel(0.4)).toBe('Same stadium');
    });

    it('labels a drive or a flight with distance and time', () => {
        expect(travelLabel(20)).toBe('20 km · ≈40 min drive');
        expect(travelLabel(1500)).toBe('1500 km · ≈5h door to door by air');
    });
});
