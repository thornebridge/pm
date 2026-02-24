CREATE TABLE `crm_automation_executions` (
	`id` text PRIMARY KEY NOT NULL,
	`rule_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`trigger_event` text NOT NULL,
	`status` text NOT NULL,
	`actions_run` text,
	`error` text,
	`duration_ms` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`rule_id`) REFERENCES `crm_automation_rules`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_crm_auto_exec_rule` ON `crm_automation_executions` (`rule_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_crm_auto_exec_entity` ON `crm_automation_executions` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE TABLE `crm_automation_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`entity_type` text NOT NULL,
	`trigger` text NOT NULL,
	`conditions` text,
	`actions` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_crm_auto_rules_entity` ON `crm_automation_rules` (`entity_type`,`enabled`);--> statement-breakpoint
CREATE TABLE `crm_custom_field_defs` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_type` text NOT NULL,
	`field_name` text NOT NULL,
	`label` text NOT NULL,
	`field_type` text NOT NULL,
	`options` text,
	`required` integer DEFAULT false NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`show_in_list` integer DEFAULT false NOT NULL,
	`show_in_card` integer DEFAULT false NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_crm_cfd_entity` ON `crm_custom_field_defs` (`entity_type`,`position`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_crm_cfd_unique_name` ON `crm_custom_field_defs` (`entity_type`,`field_name`);--> statement-breakpoint
CREATE TABLE `crm_custom_field_values` (
	`id` text PRIMARY KEY NOT NULL,
	`field_def_id` text NOT NULL,
	`entity_id` text NOT NULL,
	`value` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`field_def_id`) REFERENCES `crm_custom_field_defs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_crm_cfv_field_entity` ON `crm_custom_field_values` (`field_def_id`,`entity_id`);--> statement-breakpoint
CREATE INDEX `idx_crm_cfv_entity` ON `crm_custom_field_values` (`entity_id`);--> statement-breakpoint
ALTER TABLE `crm_opportunities` ADD `next_step` text;--> statement-breakpoint
ALTER TABLE `crm_opportunities` ADD `next_step_due_date` integer;--> statement-breakpoint
ALTER TABLE `crm_opportunities` ADD `stage_entered_at` integer;--> statement-breakpoint
ALTER TABLE `crm_opportunity_contacts` ADD `influence` text;--> statement-breakpoint
ALTER TABLE `crm_opportunity_contacts` ADD `sentiment` text;--> statement-breakpoint
ALTER TABLE `crm_opportunity_contacts` ADD `notes` text;