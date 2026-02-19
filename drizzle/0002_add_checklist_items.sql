CREATE TABLE IF NOT EXISTS `checklist_items` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL REFERENCES `tasks`(`id`) ON DELETE CASCADE,
	`title` text NOT NULL,
	`completed` integer NOT NULL DEFAULT 0,
	`position` integer NOT NULL DEFAULT 0,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_checklist_task` ON `checklist_items` (`task_id`, `position`);
