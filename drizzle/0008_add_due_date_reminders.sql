-- Add due date reminder preference columns
ALTER TABLE `notification_preferences` ADD COLUMN `reminder_due_soon` integer NOT NULL DEFAULT 1;
ALTER TABLE `notification_preferences` ADD COLUMN `reminder_due_today` integer NOT NULL DEFAULT 1;
ALTER TABLE `notification_preferences` ADD COLUMN `reminder_overdue` integer NOT NULL DEFAULT 1;
ALTER TABLE `notification_preferences` ADD COLUMN `due_date_email_mode` text NOT NULL DEFAULT 'off';
ALTER TABLE `notification_preferences` ADD COLUMN `digest_day` integer NOT NULL DEFAULT 1;
ALTER TABLE `notification_preferences` ADD COLUMN `digest_hour` integer NOT NULL DEFAULT 8;
ALTER TABLE `notification_preferences` ADD COLUMN `last_digest_sent_at` integer NOT NULL DEFAULT 0;

-- Create due date reminders sent tracking table
CREATE TABLE `due_date_reminders_sent` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
	`task_id` text NOT NULL REFERENCES `tasks`(`id`) ON DELETE CASCADE,
	`tier` text NOT NULL,
	`sent_at` integer NOT NULL
);
CREATE UNIQUE INDEX `idx_reminders_unique` ON `due_date_reminders_sent` (`user_id`, `task_id`, `tier`);
CREATE INDEX `idx_reminders_task` ON `due_date_reminders_sent` (`task_id`);
