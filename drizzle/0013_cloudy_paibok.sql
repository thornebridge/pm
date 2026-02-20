CREATE TABLE `user_themes` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`source` text NOT NULL,
	`variables` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_user_themes_user` ON `user_themes` (`user_id`);--> statement-breakpoint
ALTER TABLE `users` ADD `active_theme_id` text;