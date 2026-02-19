-- Add recurrence columns to tasks
ALTER TABLE `tasks` ADD COLUMN `recurrence` text;
ALTER TABLE `tasks` ADD COLUMN `recurrence_source_id` text;
