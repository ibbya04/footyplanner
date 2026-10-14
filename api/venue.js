// GET /api/venue?name=...&city=...&country=...
// Stadium coordinates via Photon/OpenStreetMap, cached on the CDN so each ground is looked up once for everyone.
const { geocodeVenue, cache, noStore } = require('./_lib');

module.exports = async (req, res) => {
    const clean = v => String(v || '').trim().slice(0, 120);
    const venue = { name: clean(req.query.name), city: clean(req.query.city), country: clean(req.query.country) };
    if (!venue.name && !venue.city) {
        noStore(res);
        return res.status(400).json({ error: 'name or city required' });
    }
    try {
        const loc = await geocodeVenue(venue);
        if (loc) {
            cache(res, 30 * 86400);
            return res.status(200).json(loc);
        }
        cache(res, 86400); // not found: try again tomorrow
        return res.status(200).json({ miss: true });
    } catch (err) {
        noStore(res);
        return res.status(502).json({ error: 'geocoder unavailable' });
    }
};
