CREATE TABLE `automation_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`trigger` text NOT NULL,
	`conditions` text,
	`actions` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_automation_rules_project` ON `automation_rules` (`project_id`,`enabled`);
--> statement-breakpoint
CREATE TABLE `automation_executions` (
	`id` text PRIMARY KEY NOT NULL,
	`rule_id` text NOT NULL,
	`task_id` text,
	`trigger_event` text NOT NULL,
	`status` text NOT NULL,
	`actions_run` text,
	`error` text,
	`duration_ms` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`rule_id`) REFERENCES `automation_rules`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_automation_exec_rule` ON `automation_executions` (`rule_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `idx_automation_exec_task` ON `automation_executions` (`task_id`);
