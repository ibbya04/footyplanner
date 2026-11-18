import { index, integer, primaryKey, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const competitions = sqliteTable('competitions', {
    slug: text('slug').primaryKey(),
    name: text('name').notNull(),
    short: text('short').notNull(),
    groupKey: text('group_key').notNull(),
    groupName: text('group_name').notNull(),
    color: text('color').notNull(),
    featured: integer('featured', { mode: 'boolean' }).notNull().default(false),
    sortOrder: integer('sort_order').notNull(),
    tbcWeeks: integer('tbc_weeks').notNull(),
    tbcText: text('tbc_text').notNull(),
    tbcTv: integer('tbc_tv', { mode: 'boolean' }).notNull(),
    logoUrl: text('logo_url'),
    logoKey: text('logo_key'),
    logoRetryAt: integer('logo_retry_at'),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
});

export const teams = sqliteTable('teams', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    shortName: text('short_name'),
    abbreviation: text('abbreviation'),
    crestUrl: text('crest_url'),
    crestKey: text('crest_key'),
    crestRetryAt: integer('crest_retry_at'),
});

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
        nextGeocodeAt: integer('next_geocode_at'),
    },
    t => [index('venues_next_geocode_idx').on(t.nextGeocodeAt)],
);

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
        id: text('id').primaryKey(),
        comp: text('comp').notNull(),
        kickoff: text('kickoff').notNull(),
        timeValid: integer('time_valid', { mode: 'boolean' }).notNull(),
        state: text('state').notNull(),
        statusName: text('status_name').notNull(),
        statusDetail: text('status_detail'),
        homeTeamId: text('home_team_id'),
        awayTeamId: text('away_team_id'),
        homeScore: integer('home_score'),
        awayScore: integer('away_score'),
        venueKey: text('venue_key'),
        neutralSite: integer('neutral_site', { mode: 'boolean' }).notNull().default(false),
        summaryUrl: text('summary_url'),
        removedAt: integer('removed_at'),
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

export const ingestQueue = sqliteTable(
    'ingest_queue',
    {
        comp: text('comp').notNull(),
        month: text('month').notNull(),
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
