import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { cacheFor, NO_STORE } from '../cache';
import { geocodeVenue } from '../geocode';
import { badRequest } from './validation';

const field = z
    .string()
    .optional()
    .transform(v => (v ?? '').trim().slice(0, 120));

const query = z
    .object({ name: field, city: field, country: field })
    .refine(v => v.name || v.city, 'name or city required');

export const venue = new Hono<{ Bindings: Env }>().get('/', zValidator('query', query, badRequest), async c => {
    try {
        const loc = await geocodeVenue(c.env.PHOTON_URL, c.req.valid('query'));
        if (loc) return c.json(loc, 200, cacheFor(30 * 86400));
        return c.json({ miss: true }, 200, cacheFor(86400));
    } catch {
        return c.json({ error: 'geocoder unavailable' }, 502, NO_STORE);
    }
});
