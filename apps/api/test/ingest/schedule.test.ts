import { describe, expect, it } from 'vitest';
import {
    addMonths,
    dayWindow,
    monthWindow,
    monthsBetween,
    queueMonths,
    refreshDelay,
    retryDelay,
} from '../../src/ingest/schedule';

const HOUR = 3_600_000;
const NOW = Date.parse('2026-11-18T12:00:00Z');

describe('month helpers', () => {
    it('adds months across years', () => {
        expect(addMonths('2026-11', 2)).toBe('2027-01');
        expect(addMonths('2027-01', -2)).toBe('2026-11');
        expect(monthsBetween('2026-08', '2027-05')).toBe(9);
    });

    it('gives half-open windows that compare with ISO kick-offs', () => {
        expect(monthWindow('2026-12')).toEqual({ from: '2026-12-01T00:00:00.000Z', to: '2027-01-01T00:00:00.000Z' });
        expect(dayWindow('2026-12-31')).toEqual({ from: '2026-12-31T00:00:00.000Z', to: '2027-01-01T00:00:00.000Z' });
    });

    it('queues from the season start to the horizon', () => {
        const months = queueMonths('2026-08', NOW, 9);
        expect(months[0]).toBe('2026-08');
        expect(months.at(-1)).toBe('2027-08');
        expect(months).toHaveLength(13);
    });
});

describe('refreshDelay', () => {
    it('refreshes near months most often', () => {
        expect(refreshDelay('2026-11', NOW)).toBe(3 * HOUR);
        expect(refreshDelay('2026-12', NOW)).toBe(6 * HOUR);
        expect(refreshDelay('2027-02', NOW)).toBe(12 * HOUR);
        expect(refreshDelay('2027-05', NOW)).toBe(24 * HOUR);
        expect(refreshDelay('2026-10', NOW)).toBe(24 * HOUR);
        expect(refreshDelay('2026-08', NOW)).toBe(7 * 24 * HOUR);
    });
});

describe('retryDelay', () => {
    it('backs off from 15 minutes to a 6 hour cap', () => {
        expect([1, 2, 3, 10].map(retryDelay)).toEqual([0.25 * HOUR, 0.5 * HOUR, HOUR, 6 * HOUR]);
    });
});
