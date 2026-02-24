CREATE TABLE `gmail_attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`message_id` text NOT NULL,
	`gmail_attachment_id` text NOT NULL,
	`filename` text NOT NULL,
	`mime_type` text NOT NULL,
	`size` integer NOT NULL,
	FOREIGN KEY (`message_id`) REFERENCES `gmail_messages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_gmail_attachments_msg` ON `gmail_attachments` (`message_id`);--> statement-breakpoint
CREATE TABLE `gmail_entity_links` (
	`id` text PRIMARY KEY NOT NULL,
	`thread_id` text NOT NULL,
	`contact_id` text,
	`company_id` text,
	`opportunity_id` text,
	`link_type` text DEFAULT 'auto' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`thread_id`) REFERENCES `gmail_threads`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`contact_id`) REFERENCES `crm_contacts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`company_id`) REFERENCES `crm_companies`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`opportunity_id`) REFERENCES `crm_opportunities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_gmail_links_thread` ON `gmail_entity_links` (`thread_id`);--> statement-breakpoint
CREATE INDEX `idx_gmail_links_contact` ON `gmail_entity_links` (`contact_id`);--> statement-breakpoint
CREATE INDEX `idx_gmail_links_company` ON `gmail_entity_links` (`company_id`);--> statement-breakpoint
CREATE INDEX `idx_gmail_links_opp` ON `gmail_entity_links` (`opportunity_id`);--> statement-breakpoint
CREATE TABLE `gmail_integrations` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`email` text NOT NULL,
	`access_token` text NOT NULL,
	`refresh_token` text NOT NULL,
	`token_expiry` integer NOT NULL,
	`history_id` text,
	`last_sync_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gmail_integrations_user_id_unique` ON `gmail_integrations` (`user_id`);--> statement-breakpoint
CREATE TABLE `gmail_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`thread_id` text NOT NULL,
	`user_id` text NOT NULL,
	`from_email` text NOT NULL,
	`from_name` text,
	`to_emails` text NOT NULL,
	`cc_emails` text,
	`bcc_emails` text,
	`subject` text NOT NULL,
	`body_html` text,
	`body_text` text,
	`snippet` text,
	`internal_date` integer NOT NULL,
	`label_ids` text,
	`is_read` integer DEFAULT false NOT NULL,
	`has_attachments` integer DEFAULT false NOT NULL,
	`synced_at` integer NOT NULL,
	FOREIGN KEY (`thread_id`) REFERENCES `gmail_threads`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_gmail_msgs_thread` ON `gmail_messages` (`thread_id`);--> statement-breakpoint
CREATE INDEX `idx_gmail_msgs_user_date` ON `gmail_messages` (`user_id`,`internal_date`);--> statement-breakpoint
CREATE INDEX `idx_gmail_msgs_from` ON `gmail_messages` (`from_email`);--> statement-breakpoint
CREATE TABLE `gmail_threads` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`subject` text NOT NULL,
	`snippet` text,
	`last_message_at` integer NOT NULL,
	`message_count` integer DEFAULT 1 NOT NULL,
	`is_read` integer DEFAULT false NOT NULL,
	`is_starred` integer DEFAULT false NOT NULL,
	`labels` text,
	`category` text DEFAULT 'inbox' NOT NULL,
	`synced_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_gmail_threads_user` ON `gmail_threads` (`user_id`,`last_message_at`);--> statement-breakpoint
CREATE INDEX `idx_gmail_threads_category` ON `gmail_threads` (`user_id`,`category`);