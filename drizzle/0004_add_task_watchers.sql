CREATE TABLE IF NOT EXISTS `task_watchers` (
	`task_id` text NOT NULL REFERENCES `tasks`(`id`) ON DELETE CASCADE,
	`user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
	`created_at` integer NOT NULL,
	PRIMARY KEY (`task_id`, `user_id`)
);
