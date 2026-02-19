CREATE TABLE IF NOT EXISTS `saved_views` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL REFERENCES `projects`(`id`) ON DELETE CASCADE,
	`user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
	`name` text NOT NULL,
	`filters` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_views_project_user` ON `saved_views` (`project_id`, `user_id`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `webhooks` (
	`id` text PRIMARY KEY NOT NULL,
	`url` text NOT NULL,
	`secret` text,
	`events` text NOT NULL,
	`active` integer NOT NULL DEFAULT 1,
	`created_by` text NOT NULL REFERENCES `users`(`id`),
	`created_at` integer NOT NULL
);
