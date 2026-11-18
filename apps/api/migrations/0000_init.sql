CREATE TABLE `competitions` (
	`slug` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`short` text NOT NULL,
	`group_key` text NOT NULL,
	`group_name` text NOT NULL,
	`color` text NOT NULL,
	`featured` integer DEFAULT false NOT NULL,
	`sort_order` integer NOT NULL,
	`tbc_weeks` integer NOT NULL,
	`tbc_text` text NOT NULL,
	`tbc_tv` integer NOT NULL,
	`logo_url` text,
	`logo_key` text,
	`logo_retry_at` integer,
	`active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `fixture_changes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fixture_id` text NOT NULL,
	`kind` text NOT NULL,
	`before` text,
	`after` text,
	`at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `fixture_changes_fixture_idx` ON `fixture_changes` (`fixture_id`);--> statement-breakpoint
CREATE TABLE `fixtures` (
	`id` text PRIMARY KEY NOT NULL,
	`comp` text NOT NULL,
	`kickoff` text NOT NULL,
	`time_valid` integer NOT NULL,
	`state` text NOT NULL,
	`status_name` text NOT NULL,
	`status_detail` text,
	`home_team_id` text,
	`away_team_id` text,
	`home_score` integer,
	`away_score` integer,
	`venue_key` text,
	`neutral_site` integer DEFAULT false NOT NULL,
	`summary_url` text,
	`removed_at` integer,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `fixtures_comp_kickoff_idx` ON `fixtures` (`comp`,`kickoff`);--> statement-breakpoint
CREATE INDEX `fixtures_kickoff_idx` ON `fixtures` (`kickoff`);--> statement-breakpoint
CREATE TABLE `ingest_queue` (
	`comp` text NOT NULL,
	`month` text NOT NULL,
	`next_run_at` integer NOT NULL,
	`last_run_at` integer,
	`last_ok_at` integer,
	`failures` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	PRIMARY KEY(`comp`, `month`)
);
--> statement-breakpoint
CREATE INDEX `ingest_queue_next_run_idx` ON `ingest_queue` (`next_run_at`);--> statement-breakpoint
CREATE TABLE `ingest_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer NOT NULL,
	`mode` text NOT NULL,
	`espn_calls` integer NOT NULL,
	`fixtures_written` integer NOT NULL,
	`errors` text
);
--> statement-breakpoint
CREATE INDEX `ingest_runs_started_idx` ON `ingest_runs` (`started_at`);--> statement-breakpoint
CREATE TABLE `teams` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`short_name` text,
	`abbreviation` text,
	`crest_url` text,
	`crest_key` text,
	`crest_retry_at` integer
);
--> statement-breakpoint
CREATE TABLE `venue_overrides` (
	`key` text PRIMARY KEY NOT NULL,
	`lat` real NOT NULL,
	`lng` real NOT NULL,
	`precision` text NOT NULL,
	`note` text
);
--> statement-breakpoint
CREATE TABLE `venues` (
	`key` text PRIMARY KEY NOT NULL,
	`espn_id` text,
	`name` text NOT NULL,
	`city` text,
	`country` text,
	`lat` real,
	`lng` real,
	`precision` text,
	`source` text,
	`geocode_attempts` integer DEFAULT 0 NOT NULL,
	`next_geocode_at` integer
);
--> statement-breakpoint
CREATE INDEX `venues_next_geocode_idx` ON `venues` (`next_geocode_at`);