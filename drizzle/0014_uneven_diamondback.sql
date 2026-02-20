CREATE TABLE `org_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`platform_name` text DEFAULT 'PM' NOT NULL,
	`updated_at` integer NOT NULL
);
