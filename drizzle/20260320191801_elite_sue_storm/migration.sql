DROP INDEX IF EXISTS `daily_completions_task_date_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `daily_completions_task_date_uidx` ON `daily_completions` (`task_id`,`completed_date`);