CREATE TABLE `crm_opportunity_items` (
	`id` text PRIMARY KEY NOT NULL,
	`opportunity_id` text NOT NULL,
	`product_id` text NOT NULL,
	`price_tier_id` text,
	`description` text,
	`quantity` real DEFAULT 1 NOT NULL,
	`unit_amount` integer NOT NULL,
	`discount_percent` integer,
	`discount_amount` integer,
	`setup_fee` integer,
	`billing_model` text,
	`billing_interval` text,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`opportunity_id`) REFERENCES `crm_opportunities`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `crm_products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`price_tier_id`) REFERENCES `crm_price_tiers`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_crm_opp_items_opp` ON `crm_opportunity_items` (`opportunity_id`,`position`);--> statement-breakpoint
CREATE INDEX `idx_crm_opp_items_product` ON `crm_opportunity_items` (`product_id`);--> statement-breakpoint
CREATE TABLE `crm_price_brackets` (
	`id` text PRIMARY KEY NOT NULL,
	`price_tier_id` text NOT NULL,
	`min_units` integer NOT NULL,
	`max_units` integer,
	`unit_amount` integer NOT NULL,
	`flat_amount` integer,
	`position` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`price_tier_id`) REFERENCES `crm_price_tiers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_crm_price_brackets_tier` ON `crm_price_brackets` (`price_tier_id`,`position`);--> statement-breakpoint
CREATE TABLE `crm_price_tiers` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`name` text NOT NULL,
	`billing_model` text DEFAULT 'one_time' NOT NULL,
	`unit_amount` integer,
	`currency` text DEFAULT 'USD' NOT NULL,
	`billing_interval` text,
	`setup_fee` integer,
	`trial_days` integer,
	`unit_label` text,
	`min_quantity` integer,
	`max_quantity` integer,
	`is_default` integer DEFAULT false NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `crm_products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_crm_price_tiers_product` ON `crm_price_tiers` (`product_id`,`position`);--> statement-breakpoint
CREATE TABLE `crm_products` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`sku` text,
	`description` text,
	`category` text,
	`type` text DEFAULT 'service' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`taxable` integer DEFAULT true NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_crm_products_sku` ON `crm_products` (`sku`);--> statement-breakpoint
CREATE TABLE `crm_proposal_items` (
	`id` text PRIMARY KEY NOT NULL,
	`proposal_id` text NOT NULL,
	`opportunity_item_id` text,
	`product_name` text NOT NULL,
	`product_sku` text,
	`description` text,
	`quantity` real NOT NULL,
	`unit_amount` integer NOT NULL,
	`discount_percent` integer,
	`discount_amount` integer,
	`setup_fee` integer,
	`billing_model` text,
	`billing_interval` text,
	`line_total` integer NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`proposal_id`) REFERENCES `crm_proposals`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`opportunity_item_id`) REFERENCES `crm_opportunity_items`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_crm_proposal_items_proposal` ON `crm_proposal_items` (`proposal_id`,`position`);