// D1 schema. Timestamps are milliseconds since the epoch; kick-offs are ISO strings in UTC
// ("2026-11-29T16:30:00.000Z") so they sort and compare as text.
// After changing this file run `pnpm --filter @footyplanner/api db:generate` to write a migration.
import { index, integer, primaryKey, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const competitions = sqliteTable('competitions', {
    slug: text('slug').primaryKey(), // ESPN league slug, e.g. "eng.1"
    name: text('name').notNull(),
    short: text('short').notNull(),
    groupKey: text('group_key').notNull(), // "uefa", "eng", … "other"
    groupName: text('group_name').notNull(),
    color: text('color').notNull(),
    featured: integer('featured', { mode: 'boolean' }).notNull().default(false), // in "Big 5 + UEFA"
    sortOrder: integer('sort_order').notNull(),
    tbcWeeks: integer('tbc_weeks').notNull(), // how far ahead kick-off times are usually confirmed
    tbcText: text('tbc_text').notNull(),
    tbcTv: integer('tbc_tv', { mode: 'boolean' }).notNull(), // can move for TV
    logoUrl: text('logo_url'), // ESPN's, refreshed by ingestion
    logoKey: text('logo_key'), // R2 copy
    logoRetryAt: integer('logo_retry_at'),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
});

export const teams = sqliteTable('teams', {
    id: text('id').primaryKey(), // ESPN team id
    name: text('name').notNull(),
    shortName: text('short_name'),
    abbreviation: text('abbreviation'),
    crestUrl: text('crest_url'), // ESPN's
    crestKey: text('crest_key'), // R2 copy
    crestRetryAt: integer('crest_retry_at'),
});

// Keyed like the page's venueKey(): "name|city|country", lowercase.
export const venues = sqliteTable(
    'venues',
    {
        key: text('key').primaryKey(),
        espnId: text('espn_id'),
        name: text('name').notNull(),
        city: text('city'),
        country: text('country'),
        lat: real('lat'),
        lng: real('lng'),
        precision: text('precision', { enum: ['stadium', 'city'] }),
        source: text('source', { enum: ['seed', 'photon'] }),
        geocodeAttempts: integer('geocode_attempts').notNull().default(0),
        nextGeocodeAt: integer('next_geocode_at'), // null once located
    },
    t => [index('venues_next_geocode_idx').on(t.nextGeocodeAt)],
);

// Hand-checked locations. Always win over seed data and Photon.
export const venueOverrides = sqliteTable('venue_overrides', {
    key: text('key').primaryKey(),
    lat: real('lat').notNull(),
    lng: real('lng').notNull(),
    precision: text('precision', { enum: ['stadium', 'city'] }).notNull(),
    note: text('note'),
});

export const fixtures = sqliteTable(
    'fixtures',
    {
        id: text('id').primaryKey(), // ESPN event id
        comp: text('comp').notNull(),
        kickoff: text('kickoff').notNull(),
        timeValid: integer('time_valid', { mode: 'boolean' }).notNull(),
        state: text('state').notNull(), // "pre" | "in" | "post"
        statusName: text('status_name').notNull(), // "STATUS_SCHEDULED", "STATUS_POSTPONED", …
        statusDetail: text('status_detail'), // "FT", "45'", …
        homeTeamId: text('home_team_id'),
        awayTeamId: text('away_team_id'),
        homeScore: integer('home_score'),
        awayScore: integer('away_score'),
        venueKey: text('venue_key'),
        neutralSite: integer('neutral_site', { mode: 'boolean' }).notNull().default(false),
        summaryUrl: text('summary_url'),
        removedAt: integer('removed_at'), // set when ESPN stops listing it
        updatedAt: integer('updated_at').notNull(),
    },
    t => [index('fixtures_comp_kickoff_idx').on(t.comp, t.kickoff), index('fixtures_kickoff_idx').on(t.kickoff)],
);

export const fixtureChanges = sqliteTable(
    'fixture_changes',
    {
        id: integer('id').primaryKey({ autoIncrement: true }),
        fixtureId: text('fixture_id').notNull(),
        kind: text('kind', { enum: ['kickoff', 'confirmed', 'status'] }).notNull(),
        before: text('before'),
        after: text('after'),
        at: integer('at').notNull(),
    },
    t => [index('fixture_changes_fixture_idx').on(t.fixtureId)],
);

// One row per competition and month to fetch. A run claims the rows that are due.
export const ingestQueue = sqliteTable(
    'ingest_queue',
    {
        comp: text('comp').notNull(),
        month: text('month').notNull(), // "2026-11"
        nextRunAt: integer('next_run_at').notNull(),
        lastRunAt: integer('last_run_at'),
        lastOkAt: integer('last_ok_at'),
        failures: integer('failures').notNull().default(0),
        lastError: text('last_error'),
    },
    t => [primaryKey({ columns: [t.comp, t.month] }), index('ingest_queue_next_run_idx').on(t.nextRunAt)],
);

export const ingestRuns = sqliteTable(
    'ingest_runs',
    {
        id: integer('id').primaryKey({ autoIncrement: true }),
        startedAt: integer('started_at').notNull(),
        finishedAt: integer('finished_at').notNull(),
        mode: text('mode', { enum: ['sweep', 'live'] }).notNull(),
        espnCalls: integer('espn_calls').notNull(),
        fixturesWritten: integer('fixtures_written').notNull(),
        errors: text('errors', { mode: 'json' }).$type<string[]>(),
    },
    t => [index('ingest_runs_started_idx').on(t.startedAt)],
);

export type FixtureRow = typeof fixtures.$inferSelect;
export type NewFixture = typeof fixtures.$inferInsert;
