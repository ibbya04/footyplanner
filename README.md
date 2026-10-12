# footyplanner

A single-page map of the football matches on across Europe for a set of dates. You can use it to see which games you could get to while travelling.

Open `index.html` in a browser. There's no build step, server or API key.

## How it works

- **Fixtures** come from ESPN's public scoreboard API (`site.api.espn.com/.../soccer/{league}/scoreboard?dates=YYYYMMDD-YYYYMMDD`). This is an unofficial endpoint: it needs no key, but it could change without notice. Each competition is one request, and responses are cached in `localStorage` (10 min when today is in range, so live scores update, otherwise 6 h).
- **Stadium locations:** ESPN gives the venue name, city and country, but no coordinates. The page looks them up with [Photon](https://photon.komoot.io) (OpenStreetMap). It finds the city first, then searches for a stadium within 40 km of it. If no stadium is found, the pin goes on the city centre and is drawn with a dashed border. Locations are cached in `localStorage` permanently.
- **Kick-off times** use the stadium's time zone, worked out from its country, with your own time shown next to it. The Local/Mine toggle switches between the two.
- **Map tiles** come from CARTO and OpenStreetMap, plus Esri for satellite, with attribution shown.

## Competitions

To add or remove a competition, edit the `COMPETITIONS` list in `index.html`. Each entry is an ESPN league slug, for example `ned.1` or `eng.fa`. "Big 5 + UEFA" is the default selection, and you can turn on more in the Competitions panel.

## Deploying

The page is a static file, so it can be deployed to Vercel (or GitHub Pages or Netlify) as is. If ESPN ever starts blocking browser requests (CORS), add a small proxy, such as a Vercel serverless function at `/api/scoreboard`, and point `ESPN_BASE` at it.
