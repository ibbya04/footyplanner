import { describe, expect, it } from 'vitest';
import { leagueLogo } from '../src';

describe('leagueLogo', () => {
    it('prefers the default light logo', () => {
        const logos = [
            { href: 'dark.png', rel: ['full', 'dark'] },
            { href: 'default.png', rel: ['full', 'default'] },
        ];
        expect(leagueLogo([{ logos }])).toBe('default.png');
    });

    it('falls back to the first logo, then league.logo', () => {
        expect(leagueLogo([{ logos: [{ href: 'first.png', rel: ['full'] }] }])).toBe('first.png');
        expect(leagueLogo([{ logo: 'plain.png' }])).toBe('plain.png');
        expect(leagueLogo([])).toBeNull();
        expect(leagueLogo(undefined)).toBeNull();
    });
});
