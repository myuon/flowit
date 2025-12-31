CREATE TABLE `app_config` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `execution_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`workflow_id` text NOT NULL,
	`execution_id` text NOT NULL,
	`node_id` text NOT NULL,
	`data` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`workflow_id`) REFERENCES `workflows`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `execution_logs_workflow_id_idx` ON `execution_logs` (`workflow_id`);--> statement-breakpoint
CREATE INDEX `execution_logs_execution_id_idx` ON `execution_logs` (`execution_id`);--> statement-breakpoint
CREATE INDEX `execution_logs_created_at_idx` ON `execution_logs` (`created_at`);--> statement-breakpoint
CREATE TABLE `executions` (
	`id` text PRIMARY KEY NOT NULL,
	`workflow_id` text NOT NULL,
	`version_id` text NOT NULL,
	`status` text NOT NULL,
	`inputs` text,
	`outputs` text,
	`error` text,
	`worker_id` text,
	`scheduled_at` text NOT NULL,
	`retry_count` integer DEFAULT 0 NOT NULL,
	`max_retries` integer DEFAULT 3 NOT NULL,
	`started_at` text,
	`completed_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`workflow_id`) REFERENCES `workflows`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`version_id`) REFERENCES `workflow_versions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `runs_workflow_id_idx` ON `executions` (`workflow_id`);--> statement-breakpoint
CREATE INDEX `runs_version_id_idx` ON `executions` (`version_id`);--> statement-breakpoint
CREATE INDEX `runs_status_idx` ON `executions` (`status`);--> statement-breakpoint
CREATE INDEX `runs_created_at_idx` ON `executions` (`created_at`);--> statement-breakpoint
CREATE INDEX `runs_scheduled_at_idx` ON `executions` (`scheduled_at`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `sessions_user_id_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_expires_at_idx` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `user_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`access_token` text NOT NULL,
	`refresh_token` text,
	`expires_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `user_tokens_user_id_idx` ON `user_tokens` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_tokens_user_provider_idx` ON `user_tokens` (`user_id`,`provider`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`picture` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
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