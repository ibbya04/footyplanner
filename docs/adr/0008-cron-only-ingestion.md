# 0008. Ingest ESPN on a schedule, never on request

- Status: Accepted
- Date: 2026-11-18

## Context

Until now, a visitor's request decided when ESPN was called: `/api/day` fetched ESPN on every cache miss, one call per competition. Load on ESPN grew with traffic, a slow ESPN made the page slow, and an ESPN outage broke it. ESPN's scoreboard API is unofficial, unauthenticated and undocumented, so it should be called as little and as predictably as possible.

## Decision

A Cron Trigger (`* * * * *`) pulls ESPN into D1. The API only reads D1 and never calls ESPN or Photon.

- **Sweep:** each league-month is fetched with `scoreboard?dates=YYYYMM&limit=1000` (one call per month; date ranges return 400). It's refreshed every 3 hours for the current month, every 6 to 24 hours for later months, and weekly for finished ones.
- **Live:** on even minutes, competitions with a match from 3 hours ago to 10 minutes ahead get that day re-fetched.
- **Change detection:** each response is compared with what's stored, and only fixtures that changed are written. Kick-off moves, confirmed times and postponements go into `fixture_changes`. Fixtures in the response's window that ESPN no longer lists are marked `removed_at`, unless the response is empty, which is more likely an ESPN hiccup.
- Fixture ids are `<comp>:<ESPN event id>`, the same ids the page already stores in shortlists.

## Alternatives considered

- **Read D1, fall back to ESPN on a miss.** Covers any date, but two ways for data to get in, slow responses when ESPN is slow, and visitors able to trigger ESPN calls. A full-season sweep covers every date people plan for.
- **Keep fetching on request with a longer edge cache.** Simplest, but stays exposed to ESPN's latency and availability, and needs no database, so nothing to build on for saved trips or change tracking.

## Consequences

- ESPN calls are fixed by the schedule (roughly a few hundred a day), whatever the traffic. The page works while ESPN is down, showing the last data.
- Data is at most one refresh old: about 2 minutes for live scores, a few hours for near-term fixture changes.
- Nothing outside the season window (from `SEASON_START`, up to `HORIZON_MONTHS` ahead) exists. `SEASON_START` needs moving each summer.
- European kick-offs fall on the same calendar date in UTC and US Eastern time (which ESPN groups days by), so a fixture's UTC date is used for live day calls.
- Deployed to the Free plan, a busy match day means live refreshes take the even minutes and the sweep only runs on odd ones.
