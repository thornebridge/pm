-- Task types
ALTER TABLE `tasks` ADD COLUMN `type` text NOT NULL DEFAULT 'task';
--> statement-breakpoint
ALTER TABLE `task_templates` ADD COLUMN `type` text DEFAULT 'task';
--> statement-breakpoint
-- Subtasks
ALTER TABLE `tasks` ADD COLUMN `parent_id` text REFERENCES `tasks`(`id`) ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX `idx_tasks_parent` ON `tasks` (`parent_id`);
--> statement-breakpoint
-- Project enhancements
ALTER TABLE `projects` ADD COLUMN `archived` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `projects` ADD COLUMN `readme` text;
--> statement-breakpoint
ALTER TABLE `projects` ADD COLUMN `default_assignee_id` text REFERENCES `users`(`id`) ON DELETE SET NULL;
