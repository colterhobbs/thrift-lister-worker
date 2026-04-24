CREATE TABLE `etsy_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`accessToken` text NOT NULL,
	`refreshToken` text NOT NULL,
	`accessTokenExpiresAt` int unsigned NOT NULL,
	`shopId` int unsigned,
	`shopName` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `etsy_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `etsy_tokens_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `items` ADD `imageUrls` text;--> statement-breakpoint
ALTER TABLE `items` ADD `userDescription` text;