INSERT INTO venue_overrides (key, lat, lng, precision, note)
VALUES ('estadio de la cerámica|villarreal|spain', 39.94417, -0.10361, 'stadium', 'Photon matched Villarreal in Badajoz instead of Vila-real, Castellón')
ON CONFLICT (key) DO UPDATE SET lat = excluded.lat, lng = excluded.lng, precision = excluded.precision, note = excluded.note;
