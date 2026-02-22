-- Deduplicate daily completions before adding unique index
DELETE FROM `daily_completions`
WHERE `id` NOT IN (
  SELECT MIN(`id`)
  FROM `daily_completions`
  GROUP BY `task_id`, `completed_date`
);

DROP INDEX IF EXISTS `daily_completions_task_date_idx`;

CREATE UNIQUE INDEX `daily_completions_task_date_uidx`
ON `daily_completions` (`task_id`, `completed_date`);
