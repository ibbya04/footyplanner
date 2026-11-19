import { describe, expect, it } from 'vitest';
import { readFilters, writeFilters } from './urlFilters';

const context = { competitions: ['eng.1', 'esp.1', 'ger.1'], today: '2026-11-19' };

const read = (query: string) => readFilters(new URLSearchParams(query), context);

describe('URL filters', () => {
    it('reads a clean URL as no filters over the next 7 days, and writes no filters back as a clean URL', () => {
        const filters = read('');

        expect(filters).toEqual({
            range: { from: '2026-11-19', to: '2026-11-25' },
            comps: 'all',
            day: null,
            search: '',
            timeZone: 'venue',
            inView: false,
        });
        expect(writeFilters(filters, context).toString()).toBe('');
    });

    it('writes every filter that is set, and reads it back the same', () => {
        const filters = {
            range: { from: '2026-12-05', to: '2026-12-13' },
            comps: ['esp.1', 'eng.1'],
            day: '2026-12-06',
            search: 'real madrid',
            timeZone: 'mine' as const,
            inView: true,
        };

        const params = writeFilters(filters, context);

        expect(params.toString()).toBe(
            'from=2026-12-05&to=2026-12-13&comps=eng.1%2Cesp.1&day=2026-12-06&q=real+madrid&tz=mine&in=map',
        );
        expect(readFilters(params, context)).toEqual({ ...filters, comps: ['eng.1', 'esp.1'] });
    });

    describe('falls back when the URL is broken or edited by hand', () => {
        const nextWeek = { from: '2026-11-19', to: '2026-11-25' };

        it('uses the next 7 days for a missing, malformed or reversed range', () => {
            expect(read('from=2026-12-05').range).toEqual(nextWeek);
            expect(read('from=5th&to=2026-12-13').range).toEqual(nextWeek);
            expect(read('from=2026-02-30&to=2026-03-02').range).toEqual(nextWeek);
            expect(read('from=2026-12-13&to=2026-12-05').range).toEqual(nextWeek);
        });

        it('cuts a range longer than 62 days down to 62', () => {
            expect(read('from=2026-12-01&to=2027-06-01').range).toEqual({ from: '2026-12-01', to: '2027-01-31' });
        });

        it('drops unknown competitions, and treats none left as all', () => {
            expect(read('comps=eng.1,xyz.9').comps).toEqual(['eng.1']);
            expect(read('comps=xyz.9').comps).toBe('all');
        });

        it('treats a list of every competition as all', () => {
            expect(read('comps=ger.1,eng.1,esp.1').comps).toBe('all');
        });

        it('ignores a competition listed twice', () => {
            expect(read('comps=eng.1,eng.1,esp.1').comps).toEqual(['eng.1', 'esp.1']);
        });

        it('drops a malformed day', () => {
            expect(read('day=soon').day).toBeNull();
            expect(read('day=2026-02-30').day).toBeNull();
        });

        it('keeps a real day just after the range, where a late kick-off can land in your own time', () => {
            expect(read('day=2026-11-26').day).toBe('2026-11-26');
        });
    });
});
