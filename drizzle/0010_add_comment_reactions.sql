CREATE TABLE `comment_reactions` (
	`comment_id` text NOT NULL REFERENCES `comments`(`id`) ON DELETE CASCADE,
	`user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
	`emoji` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY (`comment_id`, `user_id`, `emoji`)
);
--> statement-breakpoint
CREATE INDEX `idx_reactions_comment` ON `comment_reactions` (`comment_id`);
