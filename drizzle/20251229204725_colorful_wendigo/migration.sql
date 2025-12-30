CREATE TABLE `daily_completions` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`task_id` text NOT NULL,
	`completed_date` text NOT NULL,
	CONSTRAINT `fk_daily_completions_task_id_tasks_id_fk` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY,
	`title` text NOT NULL,
	`description` text,
	`type` text NOT NULL,
	`created_at` text NOT NULL,
	`is_archived` integer DEFAULT false NOT NULL,
	`target_days` integer,
	`target_value` integer,
	`current_value` integer,
	`unit` text,
	`completed_at` text
);
--> statement-breakpoint
CREATE INDEX `daily_completions_task_id_idx` ON `daily_completions` (`task_id`);--> statement-breakpoint
CREATE INDEX `daily_completions_task_date_idx` ON `daily_completions` (`task_id`,`completed_date`);