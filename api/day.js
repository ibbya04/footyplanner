// GET /api/day?date=YYYY-MM-DD&comps=eng.1,esp.1,...
// All requested competitions' fixtures for one day in a single, CDN-cached response.
const { ESPN_BASE, getJson, slimEvent, leagueLogo, cache, noStore } = require('./_lib');

const MAX_COMPS = 40;

function todayUtc() {
    return new Date().toISOString().slice(0, 10);
}
function daysBetween(a, b) {
    return Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
}

module.exports = async (req, res) => {
    const date = String(req.query.date || '');
    const comps = [...new Set(String(req.query.comps || '').split(',').filter(Boolean))].sort();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(Date.parse(date))) {
        noStore(res);
        return res.status(400).json({ error: 'date must be YYYY-MM-DD' });
    }
    if (!comps.length || comps.length > MAX_COMPS || !comps.every(c => /^[a-z0-9_.]{2,40}$/.test(c))) {
        noStore(res);
        return res.status(400).json({ error: `comps must be 1-${MAX_COMPS} ESPN league slugs` });
    }

    const espnDate = date.replaceAll('-', '');
    const competitions = {};
    const failed = [];
    await Promise.all(comps.map(async slug => {
        try {
            const data = await getJson(`${ESPN_BASE}/${slug}/scoreboard?dates=${espnDate}`);
            competitions[slug] = {
                logo: leagueLogo(data.leagues),
                events: (Array.isArray(data.events) ? data.events : []).map(slimEvent),
            };
        } catch (err) {
            failed.push(slug);
        }
    }));

    if (!Object.keys(competitions).length) {
        noStore(res);
        return res.status(502).json({ error: 'ESPN unavailable', failed });
    }

    // Finished days barely change; days around today carry live scores; future days change occasionally.
    const age = daysBetween(date, todayUtc()); // positive = past
    if (failed.length) cache(res, 60);
    else if (age > 1) cache(res, 7 * 86400);
    else if (age >= -1) cache(res, 120, 600);
    else cache(res, 3 * 3600);
    res.status(200).json({ date, competitions, failed });
};
