CREATE TABLE `telnyx_call_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`telnyx_call_control_id` text,
	`telnyx_call_session_id` text,
	`direction` text NOT NULL,
	`from_number` text NOT NULL,
	`to_number` text NOT NULL,
	`status` text DEFAULT 'initiated' NOT NULL,
	`started_at` integer,
	`answered_at` integer,
	`ended_at` integer,
	`duration_seconds` integer,
	`recording_url` text,
	`contact_id` text,
	`company_id` text,
	`crm_activity_id` text,
	`user_id` text NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`contact_id`) REFERENCES `crm_contacts`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`company_id`) REFERENCES `crm_companies`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`crm_activity_id`) REFERENCES `crm_activities`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_telnyx_calls_user` ON `telnyx_call_logs` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_telnyx_calls_contact` ON `telnyx_call_logs` (`contact_id`);--> statement-breakpoint
CREATE INDEX `idx_telnyx_calls_company` ON `telnyx_call_logs` (`company_id`);--> statement-breakpoint
CREATE INDEX `idx_telnyx_calls_session` ON `telnyx_call_logs` (`telnyx_call_session_id`);--> statement-breakpoint
CREATE INDEX `idx_telnyx_calls_status` ON `telnyx_call_logs` (`status`);--> statement-breakpoint
ALTER TABLE `org_settings` ADD `telnyx_enabled` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `org_settings` ADD `telnyx_api_key` text;--> statement-breakpoint
ALTER TABLE `org_settings` ADD `telnyx_connection_id` text;--> statement-breakpoint
ALTER TABLE `org_settings` ADD `telnyx_credential_id` text;--> statement-breakpoint
ALTER TABLE `org_settings` ADD `telnyx_caller_number` text;--> statement-breakpoint
ALTER TABLE `org_settings` ADD `telnyx_record_calls` integer DEFAULT false NOT NULL;