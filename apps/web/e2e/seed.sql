DELETE FROM fixtures;
DELETE FROM teams;

INSERT INTO teams (id, name, short_name, abbreviation) VALUES
    ('364', 'Liverpool', 'Liverpool', 'LIV'),
    ('359', 'Arsenal', 'Arsenal', 'ARS'),
    ('86', 'Real Madrid', 'Real Madrid', 'RMA'),
    ('83', 'Barcelona', 'Barcelona', 'BAR');

INSERT INTO fixtures (id, comp, kickoff, time_valid, state, status_name, home_team_id, away_team_id, venue_key, updated_at) VALUES
    ('eng.1:e2e-1', 'eng.1', strftime('%Y-%m-%dT15:00:00.000Z', 'now', '+1 day'), 1, 'pre', 'STATUS_SCHEDULED', '364', '359', 'anfield|liverpool|england', 0),
    ('esp.1:e2e-2', 'esp.1', strftime('%Y-%m-%dT20:00:00.000Z', 'now', '+2 days'), 0, 'pre', 'STATUS_SCHEDULED', '86', '83', 'santiago bernabéu|madrid|spain', 0);

INSERT INTO teams (id, name, short_name, abbreviation) VALUES
    ('tel', 'Telstar', 'Telstar', 'TEL'),
    ('ajx', 'Ajax', 'Ajax', 'AJA');

INSERT INTO fixtures (id, comp, kickoff, time_valid, state, status_name, home_team_id, away_team_id, venue_key, updated_at) VALUES
    ('ned.1:e2e-3', 'ned.1', strftime('%Y-%m-%dT13:30:00.000Z', 'now', '+3 days'), 1, 'pre', 'STATUS_SCHEDULED', 'tel', 'ajx', '711 stadion|velsen-zuid|netherlands', 0);

DELETE FROM ingest_runs;
INSERT INTO ingest_runs (started_at, finished_at, mode, espn_calls, fixtures_written, errors) VALUES
    ((unixepoch('now') - 190) * 1000, (unixepoch('now') - 180) * 1000, 'sweep', 1, 0, NULL);
