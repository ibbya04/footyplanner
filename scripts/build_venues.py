#!/usr/bin/env python3
"""Fill the KNOWN_VENUES table in index.html with stadium coordinates.

For every competition listed in index.html it collects the venues ESPN uses
(each team's home ground, plus grounds on the scoreboard for the coming days),
geocodes them with Photon/OpenStreetMap the same way the page does, and writes
the result between the KNOWN_VENUES markers. Venues already in the table are
kept, so re-running only looks up new ones.

Usage (from the repo root, stdlib only):
    python3 scripts/build_venues.py            # teams + next 14 days
    python3 scripts/build_venues.py --days 0   # teams only
    python3 scripts/build_venues.py --refresh  # re-geocode everything
"""

import argparse
import datetime as dt
import json
import math
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX = os.path.join(ROOT, "apps", "web", "legacy", "index.html")
ESPN = os.environ.get("ESPN_BASE", "https://site.api.espn.com/apis/site/v2/sports/soccer")
PHOTON = os.environ.get("PHOTON_URL", "https://photon.komoot.io/api/")
BLOCK = re.compile(r"(/\* KNOWN_VENUES:START \*/\n)(.*?)(/\* KNOWN_VENUES:END \*/)", re.S)
UA = {"User-Agent": "footyplanner-venue-builder (github.com/ibbya04/footyplanner)"}


def get_json(url, retries=3):
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=20) as res:
                return json.load(res)
        except urllib.error.HTTPError as err:
            if err.code in (400, 404):
                return None
            time.sleep(1 + attempt * 2)
        except Exception:
            time.sleep(1 + attempt * 2)
    return None


def venue_key(name, city, country):
    # Must match venueKey() in index.html.
    return f"v|{name}|{city}|{country}".lower()


def venue_from(raw):
    if not raw:
        return None
    addr = raw.get("address") or {}
    name = raw.get("fullName") or raw.get("displayName") or ""
    city, country = addr.get("city") or "", addr.get("country") or ""
    if not name and not city:
        return None
    return {"name": name, "city": city, "country": country}


def team_venues(slug):
    data = get_json(f"{ESPN}/{slug}/teams")
    teams = []
    try:
        for league in data["sports"][0]["leagues"]:
            teams += [t["team"] for t in league.get("teams", [])]
    except (TypeError, KeyError, IndexError):
        return []
    out = []
    for team in teams:
        venue = venue_from(team.get("venue"))
        if not venue:
            detail = get_json(f"{ESPN}/{slug}/teams/{team['id']}") or {}
            venue = venue_from((detail.get("team") or {}).get("venue"))
        if venue:
            out.append(venue)
    return out


def scoreboard_venues(slug, day):
    data = get_json(f"{ESPN}/{slug}/scoreboard?dates={day:%Y%m%d}") or {}
    out = []
    for ev in data.get("events", []):
        comp = (ev.get("competitions") or [{}])[0]
        venue = venue_from(comp.get("venue") or ev.get("venue"))
        if venue:
            out.append(venue)
    return out


def photon(**params):
    params.setdefault("lang", "en")
    data = get_json(f"{PHOTON}?{urllib.parse.urlencode(params)}") or {}
    return data.get("features") or []


def distance_km(a, b):
    to_rad = math.radians
    dlat, dlng = to_rad(b[0] - a[0]), to_rad(b[1] - a[1])
    h = math.sin(dlat / 2) ** 2 + math.cos(to_rad(a[0])) * math.cos(to_rad(b[0])) * math.sin(dlng / 2) ** 2
    return 2 * 6371 * math.asin(math.sqrt(h))


def point(feature):
    lng, lat = feature["geometry"]["coordinates"][:2]
    return (lat, lng)


city_cache = {}


def in_uefa_region(p):
    # UEFA's footprint (Azores/Canaries to Kazakhstan). Rejects mix-ups like "Monaco, France"
    # resolving to France's Kerguelen Islands in the Indian Ocean.
    return p is not None and 27 < p[0] < 72 and -32 < p[1] < 80


def geocode(venue):
    """Same strategy as the page: city first, then the nearest stadium within 40 km."""
    city = None
    if venue["city"]:
        ck = (venue["city"].lower(), venue["country"].lower())
        if ck not in city_cache:
            # ESPN's country can be wrong (Monaco is listed as France), so fall back to the city alone.
            found = None
            queries = [f"{venue['city']}, {venue['country']}" if venue["country"] else None, venue["city"]]
            for q in filter(None, queries):
                found = next((pt for pt in map(point, photon(q=q, osm_tag="place", limit=5)) if in_uefa_region(pt)), None)
                if found:
                    break
            city_cache[ck] = found
        city = city_cache[ck]
    if venue["name"]:
        params = {"q": venue["name"], "osm_tag": "leisure:stadium", "limit": 5}
        if city:
            params.update(lat=city[0], lon=city[1])
        elif venue["country"]:
            params["q"] = f"{venue['name']} {venue['country']}"
        candidates = [pt for pt in map(point, photon(**params)) if in_uefa_region(pt)]
        if city:
            candidates = sorted((c for c in candidates if distance_km(city, c) < 40), key=lambda c: distance_km(city, c))
        if candidates:
            return [round(candidates[0][0], 5), round(candidates[0][1], 5), 1]
    if city:
        return [round(city[0], 5), round(city[1], 5), 0]
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=14, help="also scan scoreboards this many days ahead (default 14)")
    ap.add_argument("--refresh", action="store_true", help="re-geocode venues already in the table")
    args = ap.parse_args()

    html = open(INDEX, encoding="utf-8").read()
    match = BLOCK.search(html)
    if not match:
        sys.exit("KNOWN_VENUES markers not found in index.html")
    existing = {}
    body = re.search(r"const KNOWN_VENUES = (\{.*\});", match.group(2), re.S)
    if body and not args.refresh:
        existing = json.loads(body.group(1))
        # Re-geocode anything a previous run placed outside Europe.
        bad = [k for k, v in existing.items() if not in_uefa_region(v)]
        for k in bad:
            del existing[k]
        if bad:
            print(f"Re-checking {len(bad)} venue(s) placed outside Europe: {', '.join(bad)}")
    slugs = re.findall(r"slug: '([^']+)'", html)
    print(f"{len(slugs)} competitions, {len(existing)} venues already known")

    venues = {}
    jobs = [("teams", s, None) for s in slugs]
    today = dt.date.today()
    jobs += [("day", s, today + dt.timedelta(days=d)) for s in slugs for d in range(args.days)]
    with ThreadPoolExecutor(8) as pool:
        def run(job):
            kind, slug, day = job
            return team_venues(slug) if kind == "teams" else scoreboard_venues(slug, day)
        for i, found in enumerate(pool.map(run, jobs), 1):
            for v in found:
                venues.setdefault(venue_key(v["name"], v["city"], v["country"]), v)
            print(f"\rESPN: {i}/{len(jobs)} requests, {len(venues)} venues", end="", flush=True)
    print()

    todo = {k: v for k, v in venues.items() if k not in existing}
    print(f"Geocoding {len(todo)} new venues…")
    result = dict(existing)
    exact = missing = 0
    with ThreadPoolExecutor(3) as pool:  # be gentle with the free Photon service
        for i, (key, loc) in enumerate(zip(todo, pool.map(geocode, todo.values())), 1):
            if loc:
                result[key] = loc
                exact += loc[2]
            else:
                missing += 1
            print(f"\rPhoton: {i}/{len(todo)}", end="", flush=True)
    print()

    lines = ",\n".join(f"    {json.dumps(k, ensure_ascii=False)}: {json.dumps(v)}" for k, v in sorted(result.items()))
    table = f"const KNOWN_VENUES = {{\n{lines}\n}};\n" if result else "const KNOWN_VENUES = {};\n"
    html = html[: match.start(2)] + table + html[match.end(2):]
    open(INDEX, "w", encoding="utf-8").write(html)
    print(f"Done: {len(result)} venues in index.html "
          f"({exact} new exact grounds, {len(todo) - exact - missing} new city-only, {missing} not found)")


if __name__ == "__main__":
    main()
