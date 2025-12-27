CREATE TABLE `node_catalog_cache` (
	`id` text PRIMARY KEY NOT NULL,
	`node_type` text NOT NULL,
	`display_name` text NOT NULL,
	`description` text,
	`category` text NOT NULL,
	`icon` text,
	`inputs_schema` text,
	`outputs_schema` text,
	`params_schema` text,
	`tags` text,
	`cached_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `node_catalog_cache_node_type_unique` ON `node_catalog_cache` (`node_type`);--> statement-breakpoint
CREATE INDEX `node_catalog_category_idx` ON `node_catalog_cache` (`category`);--> statement-breakpoint
CREATE INDEX `node_catalog_cached_at_idx` ON `node_catalog_cache` (`cached_at`);--> statement-breakpoint
CREATE TABLE `run_steps` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`node_id` text NOT NULL,
	`node_type` text NOT NULL,
	`step_order` integer NOT NULL,
	`status` text NOT NULL,
	`inputs` text,
	`outputs` text,
	`error` text,
	`logs` text,
	`started_at` text,
	`completed_at` text,
	FOREIGN KEY (`run_id`) REFERENCES `runs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `run_steps_run_id_idx` ON `run_steps` (`run_id`);--> statement-breakpoint
CREATE INDEX `run_steps_node_id_idx` ON `run_steps` (`node_id`);--> statement-breakpoint
CREATE INDEX `run_steps_order_idx` ON `run_steps` (`run_id`,`step_order`);--> statement-breakpoint
CREATE TABLE `runs` (
	`id` text PRIMARY KEY NOT NULL,
	`workflow_id` text NOT NULL,
	`version_id` text NOT NULL,
	`status` text NOT NULL,
	`inputs` text,
	`outputs` text,
	`error` text,
	`started_at` text,
	`completed_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`workflow_id`) REFERENCES `workflows`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`version_id`) REFERENCES `workflow_versions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `runs_workflow_id_idx` ON `runs` (`workflow_id`);--> statement-breakpoint
CREATE INDEX `runs_version_id_idx` ON `runs` (`version_id`);--> statement-breakpoint
CREATE INDEX `runs_status_idx` ON `runs` (`status`);--> statement-breakpoint
CREATE INDEX `runs_created_at_idx` ON `runs` (`created_at`);--> statement-breakpoint
CREATE TABLE `workflow_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`workflow_id` text NOT NULL,
	`version` integer NOT NULL,
	`dsl` text NOT NULL,
	`changelog` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`workflow_id`) REFERENCES `workflows`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `versions_workflow_id_idx` ON `workflow_versions` (`workflow_id`);--> statement-breakpoint
CREATE INDEX `versions_workflow_version_idx` ON `workflow_versions` (`workflow_id`,`version`);--> statement-breakpoint
CREATE TABLE `workflows` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`current_version_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `workflows_name_idx` ON `workflows` (`name`);--> statement-breakpoint
CREATE INDEX `workflows_updated_at_idx` ON `workflows` (`updated_at`);