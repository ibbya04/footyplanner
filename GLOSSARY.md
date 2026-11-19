# footyplanner

A map of European football fixtures for planning trips, kept up to date by copying ESPN's data on a schedule.

## Fixtures

**Competition**:
A league or cup whose fixtures footyplanner shows, such as the Premier League or the Champions League.
_Avoid_: League (when cups are included), tournament

**Fixture**:
One scheduled match between two teams in a competition.
_Avoid_: Game, event, match (in code and docs)

**TBC fixture**:
A fixture whose kick-off time hasn't been confirmed yet, usually because TV picks are still to come.
_Avoid_: Provisional fixture, unconfirmed

**Venue**:
The ground a fixture is played at, located on the map at stadium or city precision.
_Avoid_: Stadium, ground, location

**Venue override**:
A manual correction to a venue's location that wins over geocoding.

**Crest**:
A team's or competition's badge image, served from footyplanner's own storage.
_Avoid_: Logo, badge

## Ingestion

**Ingestion**:
Copying fixture data from ESPN into footyplanner's database. Only ingestion talks to ESPN or the geocoder; visitors never do.
_Avoid_: Sync, scraping

**Ingest run**:
One firing of the every-minute schedule, which does either a sweep or a live refresh, then housekeeping.
_Avoid_: Cron job, cron run, cron

**League-month**:
All of one competition's fixtures in one calendar month, the unit a sweep fetches.
_Avoid_: Month call, queue item

**Ingest queue**:
The list of league-months with when each is next due to be fetched.
_Avoid_: Work queue, job queue

**Sweep**:
An ingest run that fetches the next due league-month and stores what changed.
_Avoid_: Crawl, refresh

**Full sweep**:
Every league-month from the start of the season to the last published month having been fetched at least once.

**Backlog**:
League-months, venues or crests that are due but not yet done, such as after the first deploy or an outage.

**Live refresh**:
An ingest run, on even minutes, that re-fetches today's fixtures for competitions with a match in its kick-off window.
_Avoid_: Live run, live sweep

**Kick-off window**:
From 10 minutes before a fixture's kick-off until 3 hours after it.

**Housekeeping**:
The end of every ingest run: geocoding one venue and copying a few crests.
