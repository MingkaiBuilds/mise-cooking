CREATE TABLE `budget_ledger` (
	`period` text PRIMARY KEY NOT NULL,
	`spent_micros` integer DEFAULT 0 NOT NULL,
	`reserved_micros` integer DEFAULT 0 NOT NULL,
	`request_count` integer DEFAULT 0 NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `generation_locks` (
	`cache_key` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_generation_locks_expires_at` ON `generation_locks` (`expires_at`);--> statement-breakpoint
CREATE TABLE `quota_counters` (
	`bucket` text NOT NULL,
	`window` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`bucket`, `window`)
);
--> statement-breakpoint
CREATE INDEX `idx_quota_counters_updated_at` ON `quota_counters` (`updated_at`);--> statement-breakpoint
CREATE TABLE `recipe_cache` (
	`cache_key` text PRIMARY KEY NOT NULL,
	`video_id` text NOT NULL,
	`source_url` text NOT NULL,
	`recipe_json` text NOT NULL,
	`model` text NOT NULL,
	`input_tokens` integer DEFAULT 0 NOT NULL,
	`output_tokens` integer DEFAULT 0 NOT NULL,
	`estimated_cost_micros` integer DEFAULT 0 NOT NULL,
	`hit_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_recipe_cache_video_id` ON `recipe_cache` (`video_id`);--> statement-breakpoint
CREATE INDEX `idx_recipe_cache_expires_at` ON `recipe_cache` (`expires_at`);--> statement-breakpoint
PRAGMA optimize;
