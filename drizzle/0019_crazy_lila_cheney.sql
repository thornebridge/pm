CREATE TABLE `booking_event_types` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`duration_minutes` integer DEFAULT 30 NOT NULL,
	`color` text DEFAULT '#6366f1' NOT NULL,
	`location` text,
	`buffer_minutes` integer DEFAULT 0 NOT NULL,
	`min_notice_hours` integer DEFAULT 4 NOT NULL,
	`max_days_out` integer DEFAULT 60 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `booking_event_types_slug_unique` ON `booking_event_types` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_booking_event_types_user` ON `booking_event_types` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_booking_event_types_slug` ON `booking_event_types` (`slug`);--> statement-breakpoint
CREATE TABLE `bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`event_type_id` text NOT NULL,
	`invitee_name` text NOT NULL,
	`invitee_email` text NOT NULL,
	`start_time` integer NOT NULL,
	`end_time` integer NOT NULL,
	`timezone` text DEFAULT 'America/New_York' NOT NULL,
	`status` text DEFAULT 'confirmed' NOT NULL,
	`notes` text,
	`google_event_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`event_type_id`) REFERENCES `booking_event_types`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_bookings_event_type` ON `bookings` (`event_type_id`);--> statement-breakpoint
CREATE INDEX `idx_bookings_start_time` ON `bookings` (`start_time`);--> statement-breakpoint
CREATE INDEX `idx_bookings_status` ON `bookings` (`status`);--> statement-breakpoint
CREATE TABLE `calendar_integrations` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider` text DEFAULT 'google' NOT NULL,
	`access_token` text NOT NULL,
	`refresh_token` text NOT NULL,
	`token_expiry` integer NOT NULL,
	`calendar_id` text DEFAULT 'primary' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `calendar_integrations_user_id_unique` ON `calendar_integrations` (`user_id`);--> statement-breakpoint
ALTER TABLE `org_settings` ADD `google_client_id` text;--> statement-breakpoint
ALTER TABLE `org_settings` ADD `google_client_secret` text;