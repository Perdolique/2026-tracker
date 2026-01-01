-- Add updated_at column with default value for existing rows
-- For existing rows, set to '2026-01-01T00:00:00.000Z' as placeholder
-- New rows will have proper timestamp from application code
ALTER TABLE `tasks` ADD `updated_at` text NOT NULL DEFAULT '2026-01-01T00:00:00.000Z';

-- Update existing rows to use created_at as initial updated_at value
UPDATE `tasks` SET `updated_at` = `created_at` WHERE `updated_at` = '2026-01-01T00:00:00.000Z';
