import { describe, expect, it } from 'vitest';
import { editTokenIn, tripIdIn, tripLinks } from './link';

describe('tripIdIn', () => {
    it('reads the trip id from a trip page path', () => {
        expect(tripIdIn('/t/Ab3_x-9Qz0')).toBe('Ab3_x-9Qz0');
        expect(tripIdIn('/t/Ab3_x-9Qz0/')).toBe('Ab3_x-9Qz0');
    });

    it('ignores every other path', () => {
        for (const path of ['/', '/t/', '/t/short', '/t/Ab3_x-9Qz0.ics', '/x/Ab3_x-9Qz0', '/t/Ab3_x-9Qz0/more']) {
            expect(tripIdIn(path), path).toBeNull();
        }
    });
});

describe('editTokenIn', () => {
    it('reads the edit token from the hash', () => {
        const token = 'a'.repeat(43);
        expect(editTokenIn(`#edit=${token}`)).toBe(token);
    });

    it('ignores a missing or malformed token', () => {
        for (const hash of ['', '#', '#edit=', '#edit=not a token', '#other=abc']) {
            expect(editTokenIn(hash), hash).toBeNull();
        }
    });
});

describe('tripLinks', () => {
    it('builds the public page, private edit and calendar feed links', () => {
        expect(tripLinks('https://footyplanner.example', 'Ab3_x-9Qz0', 'secret_token')).toEqual({
            page: 'https://footyplanner.example/t/Ab3_x-9Qz0',
            edit: 'https://footyplanner.example/t/Ab3_x-9Qz0#edit=secret_token',
            feed: 'https://footyplanner.example/t/Ab3_x-9Qz0.ics',
            subscribe: 'webcal://footyplanner.example/t/Ab3_x-9Qz0.ics',
        });
    });

    it('keeps the port for a local server', () => {
        expect(tripLinks('http://localhost:8788', 'Ab3_x-9Qz0', null).subscribe).toBe(
            'webcal://localhost:8788/t/Ab3_x-9Qz0.ics',
        );
    });
});
