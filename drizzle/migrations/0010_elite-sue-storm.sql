DROP INDEX IF EXISTS `daily_completions_task_date_idx`;
DROP INDEX IF EXISTS `daily_completions_task_date_uidx`;
CREATE UNIQUE INDEX `daily_completions_task_date_uidx` ON `daily_completions` (`task_id`,`completed_date`);
