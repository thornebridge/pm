CREATE TABLE `crm_activities` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`subject` text NOT NULL,
	`description` text,
	`company_id` text,
	`contact_id` text,
	`opportunity_id` text,
	`scheduled_at` integer,
	`completed_at` integer,
	`duration_minutes` integer,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `crm_companies`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`contact_id`) REFERENCES `crm_contacts`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`opportunity_id`) REFERENCES `crm_opportunities`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_crm_act_company` ON `crm_activities` (`company_id`);--> statement-breakpoint
CREATE INDEX `idx_crm_act_contact` ON `crm_activities` (`contact_id`);--> statement-breakpoint
CREATE INDEX `idx_crm_act_opp` ON `crm_activities` (`opportunity_id`);--> statement-breakpoint
CREATE INDEX `idx_crm_act_user_date` ON `crm_activities` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `crm_companies` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`website` text,
	`industry` text,
	`size` text,
	`phone` text,
	`address` text,
	`city` text,
	`state` text,
	`country` text DEFAULT 'US',
	`notes` text,
	`owner_id` text,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_crm_companies_owner` ON `crm_companies` (`owner_id`);--> statement-breakpoint
CREATE TABLE `crm_contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`email` text,
	`phone` text,
	`title` text,
	`is_primary` integer DEFAULT false NOT NULL,
	`source` text,
	`notes` text,
	`owner_id` text,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `crm_companies`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_crm_contacts_company` ON `crm_contacts` (`company_id`);--> statement-breakpoint
CREATE INDEX `idx_crm_contacts_owner` ON `crm_contacts` (`owner_id`);--> statement-breakpoint
CREATE INDEX `idx_crm_contacts_email` ON `crm_contacts` (`email`);--> statement-breakpoint
CREATE TABLE `crm_opportunities` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`company_id` text NOT NULL,
	`contact_id` text,
	`stage_id` text NOT NULL,
	`value` integer,
	`currency` text DEFAULT 'USD' NOT NULL,
	`probability` integer,
	`expected_close_date` integer,
	`actual_close_date` integer,
	`priority` text DEFAULT 'warm' NOT NULL,
	`source` text,
	`description` text,
	`lost_reason` text,
	`position` real NOT NULL,
	`owner_id` text,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `crm_companies`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`contact_id`) REFERENCES `crm_contacts`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`stage_id`) REFERENCES `crm_pipeline_stages`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_crm_opps_company` ON `crm_opportunities` (`company_id`);--> statement-breakpoint
CREATE INDEX `idx_crm_opps_stage` ON `crm_opportunities` (`stage_id`,`position`);--> statement-breakpoint
CREATE INDEX `idx_crm_opps_owner` ON `crm_opportunities` (`owner_id`);--> statement-breakpoint
CREATE INDEX `idx_crm_opps_close` ON `crm_opportunities` (`expected_close_date`);--> statement-breakpoint
CREATE TABLE `crm_opportunity_contacts` (
	`opportunity_id` text NOT NULL,
	`contact_id` text NOT NULL,
	`role` text,
	PRIMARY KEY(`opportunity_id`, `contact_id`),
	FOREIGN KEY (`opportunity_id`) REFERENCES `crm_opportunities`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`contact_id`) REFERENCES `crm_contacts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `crm_pipeline_stages` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`color` text NOT NULL,
	`position` integer NOT NULL,
	`is_closed` integer DEFAULT false NOT NULL,
	`is_won` integer DEFAULT false NOT NULL,
	`probability` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_crm_stages_position` ON `crm_pipeline_stages` (`position`);--> statement-breakpoint
CREATE TABLE `crm_proposals` (
	`id` text PRIMARY KEY NOT NULL,
	`opportunity_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`amount` integer,
	`status` text DEFAULT 'draft' NOT NULL,
	`sent_at` integer,
	`expires_at` integer,
	`responded_at` integer,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`opportunity_id`) REFERENCES `crm_opportunities`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_crm_proposals_opp` ON `crm_proposals` (`opportunity_id`);--> statement-breakpoint
CREATE TABLE `crm_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`due_date` integer,
	`completed_at` integer,
	`priority` text DEFAULT 'medium' NOT NULL,
	`company_id` text,
	`contact_id` text,
	`opportunity_id` text,
	`assignee_id` text,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `crm_companies`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`contact_id`) REFERENCES `crm_contacts`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`opportunity_id`) REFERENCES `crm_opportunities`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`assignee_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_crm_tasks_assignee` ON `crm_tasks` (`assignee_id`,`completed_at`);--> statement-breakpoint
CREATE INDEX `idx_crm_tasks_due` ON `crm_tasks` (`due_date`);