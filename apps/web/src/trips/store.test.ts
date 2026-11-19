import { describe, expect, it } from 'vitest';
import { forgetTripLink, pendingSave, readTripLink, type TripLink, writeTripLink } from './store';

function memoryStorage(initial: Record<string, string> = {}) {
    const items = new Map(Object.entries(initial));
    return {
        getItem: (key: string) => items.get(key) ?? null,
        setItem: (key: string, value: string) => void items.set(key, value),
        removeItem: (key: string) => void items.delete(key),
        items,
    };
}

const link: TripLink = {
    id: 'Ab3_x-9Qz0',
    editToken: 't'.repeat(43),
    name: 'Northern weekend',
    savedIds: ['eng.1:1', 'eng.1:2'],
};

describe('trip link storage', () => {
    it('keeps the linked trip under its own key', () => {
        const storage = memoryStorage();
        writeTripLink(storage, link);
        expect(JSON.parse(storage.items.get('fp:trip')!)).toEqual(link);
        expect(readTripLink(storage)).toEqual(link);
    });

    it('reads nothing from missing, broken or foreign data', () => {
        for (const raw of [undefined, 'not json', '[]', '{"id":"Ab3_x-9Qz0"}', JSON.stringify({ ...link, id: 'x' })]) {
            const storage = memoryStorage(raw === undefined ? {} : { 'fp:trip': raw });
            expect(readTripLink(storage), raw).toBeNull();
        }
    });

    it('forgets the link', () => {
        const storage = memoryStorage();
        writeTripLink(storage, link);
        forgetTripLink(storage);
        expect(readTripLink(storage)).toBeNull();
    });

    it('copes with storage that throws', () => {
        const broken = {
            getItem: () => {
                throw new Error('blocked');
            },
            setItem: () => {
                throw new Error('full');
            },
            removeItem: () => {
                throw new Error('blocked');
            },
        };
        expect(readTripLink(broken)).toBeNull();
        expect(() => writeTripLink(broken, link)).not.toThrow();
        expect(() => forgetTripLink(broken)).not.toThrow();
    });
});

describe('pendingSave', () => {
    it('has nothing to send when the shortlist matches what was saved', () => {
        expect(pendingSave(link, link.name, ['eng.1:1', 'eng.1:2'])).toBeNull();
    });

    it('sends the whole trip when a fixture or the name changed', () => {
        expect(pendingSave(link, link.name, ['eng.1:1'])).toEqual({
            name: 'Northern weekend',
            fixtureIds: ['eng.1:1'],
        });
        expect(pendingSave(link, 'Away days', link.savedIds)).toEqual({ name: 'Away days', fixtureIds: link.savedIds });
    });

    it('never empties a trip', () => {
        expect(pendingSave(link, link.name, [])).toBeNull();
    });
});
