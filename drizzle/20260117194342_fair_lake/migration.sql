CREATE TABLE `progress_completions` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`task_id` text NOT NULL,
	`completed_date` text NOT NULL,
	`value` integer NOT NULL,
	CONSTRAINT `fk_progress_completions_task_id_tasks_id_fk` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `progress_completions_task_id_idx` ON `progress_completions` (`task_id`);--> statement-breakpoint
CREATE INDEX `progress_completions_task_date_idx` ON `progress_completions` (`task_id`,`completed_date`);