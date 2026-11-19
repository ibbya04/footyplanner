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
