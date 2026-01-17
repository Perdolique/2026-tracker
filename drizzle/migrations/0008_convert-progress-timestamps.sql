-- Convert existing progress_completions from YYYY-MM-DD to ISO timestamp format
-- This migration converts dates like '2026-01-15' to '2026-01-15T12:00:00.000Z' (noon UTC)
UPDATE `progress_completions`
SET `completed_date` = `completed_date` || 'T12:00:00.000Z'
WHERE `completed_date` NOT LIKE '%T%';
