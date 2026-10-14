// Shared helpers for the Vercel functions. Files starting with "_" are not exposed as routes.

const ESPN_BASE = process.env.ESPN_BASE || 'https://site.api.espn.com/apis/site/v2/sports/soccer';
const PHOTON = process.env.PHOTON_URL || 'https://photon.komoot.io/api/';
const UA = 'footyplanner (https://github.com/ibbya04/footyplanner)';

async function getJson(url, timeoutMs = 8000) {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) {
        const err = new Error(`HTTP ${res.status}`);
        err.status = res.status;
        throw err;
    }
    return res.json();
}

// Keep only the fields the page uses (mirrors slimEvent in index.html).
function slimEvent(ev) {
    const c = (ev.competitions && ev.competitions[0]) || {};
    const team = t => t && {
        displayName: t.displayName, name: t.name, shortDisplayName: t.shortDisplayName, abbreviation: t.abbreviation,
        logo: t.logo || (t.logos && t.logos[0] && t.logos[0].href),
    };
    const type = ev.status && ev.status.type;
    return {
        id: ev.id, date: ev.date, timeValid: ev.timeValid,
        status: type ? { type: { state: type.state, name: type.name, shortDetail: type.shortDetail, detail: type.detail } } : undefined,
        links: (ev.links || []).filter(l => (l.rel || []).includes('summary')).slice(0, 1).map(l => ({ rel: l.rel, href: l.href })),
        competitions: [{
            date: c.date, timeValid: c.timeValid, neutralSite: c.neutralSite,
            venue: c.venue && {
                fullName: c.venue.fullName, displayName: c.venue.displayName,
                address: c.venue.address && { city: c.venue.address.city, country: c.venue.address.country },
            },
            competitors: (c.competitors || []).map(t => ({ homeAway: t.homeAway, score: t.score, winner: t.winner, team: team(t.team) })),
        }],
    };
}

function leagueLogo(leagues) {
    const league = Array.isArray(leagues) && leagues[0];
    if (!league) return null;
    const logos = league.logos || [];
    const pick = logos.find(l => (l.rel || []).includes('default') && !(l.rel || []).includes('dark')) || logos[0];
    return (pick && pick.href) || league.logo || null;
}

function distanceKm(a, b) {
    const R = 6371, toRad = x => x * Math.PI / 180;
    const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
}

async function photon(params) {
    const qs = new URLSearchParams({ lang: 'en', ...params });
    const data = await getJson(`${PHOTON}?${qs}`);
    return Array.isArray(data.features) ? data.features : [];
}

const point = f => ({ lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] });
const round = n => Math.round(n * 1e5) / 1e5;

// Same strategy as the page: find the city, then the nearest stadium within 40 km of it.
async function geocodeVenue({ name, city, country }) {
    let cityPt = null;
    if (city) {
        const feats = await photon({ q: country ? `${city}, ${country}` : city, osm_tag: 'place', limit: '1' });
        if (feats.length) cityPt = point(feats[0]);
    }
    if (name) {
        const params = { q: name, osm_tag: 'leisure:stadium', limit: '5' };
        if (cityPt) Object.assign(params, { lat: String(cityPt.lat), lon: String(cityPt.lng) });
        else if (country) params.q = `${name} ${country}`;
        const best = (await photon(params))
            .map(f => ({ p: point(f), d: cityPt ? distanceKm(cityPt, point(f)) : 0 }))
            .filter(x => !cityPt || x.d < 40)
            .sort((a, b) => a.d - b.d)[0];
        if (best) return { lat: round(best.p.lat), lng: round(best.p.lng), precision: 'stadium' };
    }
    return cityPt ? { lat: round(cityPt.lat), lng: round(cityPt.lng), precision: 'city' } : null;
}

// Vercel's CDN honours s-maxage, so one visitor's request warms the cache for everyone.
function cache(res, seconds, staleSeconds = seconds * 10) {
    res.setHeader('Cache-Control', `public, max-age=0, s-maxage=${seconds}, stale-while-revalidate=${staleSeconds}`);
}
function noStore(res) {
    res.setHeader('Cache-Control', 'no-store');
}

module.exports = { ESPN_BASE, getJson, slimEvent, leagueLogo, geocodeVenue, cache, noStore };
