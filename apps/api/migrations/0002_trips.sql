CREATE TABLE `trips` (
	`id` text PRIMARY KEY NOT NULL,
	`edit_token_hash` text NOT NULL,
	`name` text,
	`fixture_ids` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
