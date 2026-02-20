CREATE TABLE `fin_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`account_number` integer NOT NULL,
	`name` text NOT NULL,
	`account_type` text NOT NULL,
	`subtype` text,
	`description` text,
	`parent_id` text,
	`normal_balance` text NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`is_system` integer DEFAULT false NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fin_accounts_account_number_unique` ON `fin_accounts` (`account_number`);--> statement-breakpoint
CREATE INDEX `idx_fin_accounts_type_active` ON `fin_accounts` (`account_type`,`active`);--> statement-breakpoint
CREATE INDEX `idx_fin_accounts_parent` ON `fin_accounts` (`parent_id`);--> statement-breakpoint
CREATE TABLE `fin_bank_account_meta` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`institution_name` text,
	`account_number_last4` text,
	`routing_number` text,
	`account_subtype` text NOT NULL,
	`opening_balance` integer DEFAULT 0 NOT NULL,
	`opening_balance_date` integer,
	`last_reconciled_date` integer,
	`last_reconciled_balance` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `fin_accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fin_bank_account_meta_account_id_unique` ON `fin_bank_account_meta` (`account_id`);--> statement-breakpoint
CREATE TABLE `fin_budgets` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`period_type` text NOT NULL,
	`period_start` integer NOT NULL,
	`period_end` integer NOT NULL,
	`amount` integer NOT NULL,
	`notes` text,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `fin_accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_fin_budgets_account_period` ON `fin_budgets` (`account_id`,`period_start`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_fin_budgets_unique` ON `fin_budgets` (`account_id`,`period_type`,`period_start`);--> statement-breakpoint
CREATE TABLE `fin_journal_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`entry_number` integer NOT NULL,
	`date` integer NOT NULL,
	`description` text NOT NULL,
	`memo` text,
	`reference_number` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`crm_opportunity_id` text,
	`crm_proposal_id` text,
	`crm_company_id` text,
	`voided_entry_id` text,
	`voided_at` integer,
	`void_reason` text,
	`recurring_rule_id` text,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`crm_opportunity_id`) REFERENCES `crm_opportunities`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`crm_proposal_id`) REFERENCES `crm_proposals`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`crm_company_id`) REFERENCES `crm_companies`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_fin_je_date` ON `fin_journal_entries` (`date`);--> statement-breakpoint
CREATE INDEX `idx_fin_je_status_date` ON `fin_journal_entries` (`status`,`date`);--> statement-breakpoint
CREATE INDEX `idx_fin_je_source` ON `fin_journal_entries` (`source`);--> statement-breakpoint
CREATE INDEX `idx_fin_je_crm_opp` ON `fin_journal_entries` (`crm_opportunity_id`);--> statement-breakpoint
CREATE INDEX `idx_fin_je_entry_number` ON `fin_journal_entries` (`entry_number`);--> statement-breakpoint
CREATE TABLE `fin_journal_lines` (
	`id` text PRIMARY KEY NOT NULL,
	`journal_entry_id` text NOT NULL,
	`account_id` text NOT NULL,
	`debit` integer DEFAULT 0 NOT NULL,
	`credit` integer DEFAULT 0 NOT NULL,
	`memo` text,
	`position` integer DEFAULT 0 NOT NULL,
	`reconciled` integer DEFAULT false NOT NULL,
	`reconciled_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`journal_entry_id`) REFERENCES `fin_journal_entries`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`account_id`) REFERENCES `fin_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_fin_jl_entry_pos` ON `fin_journal_lines` (`journal_entry_id`,`position`);--> statement-breakpoint
CREATE INDEX `idx_fin_jl_account_entry` ON `fin_journal_lines` (`account_id`,`journal_entry_id`);--> statement-breakpoint
CREATE INDEX `idx_fin_jl_account_reconciled` ON `fin_journal_lines` (`account_id`,`reconciled`);--> statement-breakpoint
CREATE TABLE `fin_reconciliations` (
	`id` text PRIMARY KEY NOT NULL,
	`bank_account_id` text NOT NULL,
	`statement_date` integer NOT NULL,
	`statement_balance` integer NOT NULL,
	`reconciled_balance` integer,
	`status` text DEFAULT 'in_progress' NOT NULL,
	`completed_at` integer,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`bank_account_id`) REFERENCES `fin_accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `fin_recurring_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`frequency` text NOT NULL,
	`start_date` integer NOT NULL,
	`end_date` integer,
	`next_occurrence` integer NOT NULL,
	`auto_post` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`template_description` text NOT NULL,
	`template_lines` text NOT NULL,
	`last_generated_at` integer,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_fin_rr_status_next` ON `fin_recurring_rules` (`status`,`next_occurrence`);--> statement-breakpoint
CREATE INDEX `idx_fin_rr_next` ON `fin_recurring_rules` (`next_occurrence`);