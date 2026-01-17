CREATE TABLE `progress_completions` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`task_id` text NOT NULL,
	`completed_date` text NOT NULL,
	`value` integer NOT NULL,
	CONSTRAINT `fk_progress_completions_task_id_tasks_id_fk` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE
);

CREATE INDEX `progress_completions_task_id_idx` ON `progress_completions` (`task_id`);
CREATE INDEX `progress_completions_task_date_idx` ON `progress_completions` (`task_id`,`completed_date`);

-- Data migration: create initial progress_completions entries for existing progress tasks with current_value > 0
INSERT INTO `progress_completions` (`task_id`, `completed_date`, `value`)
SELECT `id`, substr(`created_at`, 1, 10), `current_value`
FROM `tasks`
WHERE `type` = 'progress' AND `current_value` > 0;