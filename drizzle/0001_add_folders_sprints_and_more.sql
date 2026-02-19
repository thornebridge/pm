-- Folders
CREATE TABLE `folders` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`parent_id` text,
	`color` text,
	`position` integer NOT NULL DEFAULT 0,
	`created_by` text NOT NULL REFERENCES `users`(`id`),
	`created_at` integer NOT NULL
);
--> statement-breakpoint
-- Add folder_id to projects
ALTER TABLE `projects` ADD COLUMN `folder_id` text REFERENCES `folders`(`id`) ON DELETE SET NULL;
--> statement-breakpoint
-- Sprints
CREATE TABLE `sprints` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL REFERENCES `projects`(`id`) ON DELETE CASCADE,
	`name` text NOT NULL,
	`goal` text,
	`start_date` integer,
	`end_date` integer,
	`status` text NOT NULL DEFAULT 'planning',
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_sprints_project` ON `sprints` (`project_id`, `status`);
--> statement-breakpoint
-- Add sprint columns to tasks
ALTER TABLE `tasks` ADD COLUMN `sprint_id` text REFERENCES `sprints`(`id`) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE `tasks` ADD COLUMN `start_date` integer;
--> statement-breakpoint
ALTER TABLE `tasks` ADD COLUMN `estimate_points` integer;
--> statement-breakpoint
CREATE INDEX `idx_tasks_sprint` ON `tasks` (`sprint_id`);
--> statement-breakpoint
-- Task Dependencies
CREATE TABLE `task_dependencies` (
	`task_id` text NOT NULL REFERENCES `tasks`(`id`) ON DELETE CASCADE,
	`depends_on_task_id` text NOT NULL REFERENCES `tasks`(`id`) ON DELETE CASCADE,
	`type` text NOT NULL DEFAULT 'blocks',
	PRIMARY KEY(`task_id`, `depends_on_task_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_deps_depends_on` ON `task_dependencies` (`depends_on_task_id`);
--> statement-breakpoint
-- Attachments
CREATE TABLE `attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL REFERENCES `tasks`(`id`) ON DELETE CASCADE,
	`filename` text NOT NULL,
	`original_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`size` integer NOT NULL,
	`storage_path` text NOT NULL,
	`uploaded_by` text NOT NULL REFERENCES `users`(`id`),
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_attachments_task` ON `attachments` (`task_id`);
--> statement-breakpoint
-- In-App Notifications
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`body` text,
	`url` text,
	`task_id` text REFERENCES `tasks`(`id`) ON DELETE CASCADE,
	`actor_id` text REFERENCES `users`(`id`),
	`read` integer NOT NULL DEFAULT 0,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_notifications_user` ON `notifications` (`user_id`, `read`, `created_at`);
--> statement-breakpoint
-- Add on_mention to notification preferences
ALTER TABLE `notification_preferences` ADD COLUMN `on_mention` integer NOT NULL DEFAULT 1;
--> statement-breakpoint
-- Time Entries
CREATE TABLE `time_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL REFERENCES `tasks`(`id`) ON DELETE CASCADE,
	`user_id` text NOT NULL REFERENCES `users`(`id`),
	`description` text,
	`started_at` integer NOT NULL,
	`stopped_at` integer,
	`duration_ms` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_time_entries_task` ON `time_entries` (`task_id`);
--> statement-breakpoint
-- Task Templates
CREATE TABLE `task_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL REFERENCES `projects`(`id`) ON DELETE CASCADE,
	`name` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`priority` text DEFAULT 'medium',
	`label_ids` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
-- Sprint Snapshots
CREATE TABLE `sprint_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`sprint_id` text NOT NULL REFERENCES `sprints`(`id`) ON DELETE CASCADE,
	`date` integer NOT NULL,
	`total_tasks` integer NOT NULL,
	`completed_tasks` integer NOT NULL,
	`total_points` integer NOT NULL DEFAULT 0,
	`completed_points` integer NOT NULL DEFAULT 0,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_snapshots_sprint` ON `sprint_snapshots` (`sprint_id`, `date`);
