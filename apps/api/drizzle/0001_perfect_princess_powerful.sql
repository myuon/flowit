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
CREATE INDEX `execution_logs_created_at_idx` ON `execution_logs` (`created_at`);