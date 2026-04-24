ALTER TABLE `ebay_tokens` MODIFY COLUMN `accessTokenExpiresAt` bigint unsigned NOT NULL;--> statement-breakpoint
ALTER TABLE `ebay_tokens` MODIFY COLUMN `refreshTokenExpiresAt` bigint unsigned NOT NULL;--> statement-breakpoint
ALTER TABLE `etsy_tokens` MODIFY COLUMN `accessTokenExpiresAt` bigint unsigned NOT NULL;