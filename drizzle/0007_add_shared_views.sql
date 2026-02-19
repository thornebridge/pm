ALTER TABLE `saved_views` ADD COLUMN `shared` integer NOT NULL DEFAULT 0;
ALTER TABLE `saved_views` ADD COLUMN `updated_at` integer NOT NULL DEFAULT 0;
UPDATE `saved_views` SET `updated_at` = `created_at` WHERE `updated_at` = 0;
