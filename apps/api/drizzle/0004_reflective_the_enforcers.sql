ALTER TABLE `runs` ADD `worker_id` text;--> statement-breakpoint
ALTER TABLE `runs` ADD `scheduled_at` text NOT NULL;--> statement-breakpoint
ALTER TABLE `runs` ADD `retry_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `runs` ADD `max_retries` integer DEFAULT 3 NOT NULL;--> statement-breakpoint
CREATE INDEX `runs_scheduled_at_idx` ON `runs` (`scheduled_at`);