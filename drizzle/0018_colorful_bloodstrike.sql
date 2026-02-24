CREATE TABLE `dial_queue_items` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`contact_id` text NOT NULL,
	`position` real NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`disposition` text,
	`notes` text,
	`callback_at` integer,
	`call_log_id` text,
	`crm_activity_id` text,
	`call_duration_seconds` integer,
	`dialed_at` integer,
	`completed_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `dial_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`contact_id`) REFERENCES `crm_contacts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`call_log_id`) REFERENCES `telnyx_call_logs`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`crm_activity_id`) REFERENCES `crm_activities`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_dial_queue_session` ON `dial_queue_items` (`session_id`,`position`);--> statement-breakpoint
CREATE INDEX `idx_dial_queue_contact` ON `dial_queue_items` (`contact_id`);--> statement-breakpoint
CREATE INDEX `idx_dial_queue_status` ON `dial_queue_items` (`session_id`,`status`);--> statement-breakpoint
CREATE TABLE `dial_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`user_id` text NOT NULL,
	`total_contacts` integer DEFAULT 0 NOT NULL,
	`completed_contacts` integer DEFAULT 0 NOT NULL,
	`total_connected` integer DEFAULT 0 NOT NULL,
	`total_no_answer` integer DEFAULT 0 NOT NULL,
	`total_duration_seconds` integer DEFAULT 0 NOT NULL,
	`started_at` integer,
	`ended_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_dial_sessions_user` ON `dial_sessions` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_dial_sessions_status` ON `dial_sessions` (`status`);