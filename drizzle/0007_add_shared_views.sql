ALTER TABLE `saved_views` ADD COLUMN `shared` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `saved_views` ADD COLUMN `updated_at` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
UPDATE `saved_views` SET `updated_at` = `created_at` WHERE `updated_at` = 0;
