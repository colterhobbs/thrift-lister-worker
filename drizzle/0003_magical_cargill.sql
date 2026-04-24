CREATE TABLE `ebay_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`accessToken` text NOT NULL,
	`refreshToken` text NOT NULL,
	`accessTokenExpiresAt` int unsigned NOT NULL,
	`refreshTokenExpiresAt` int unsigned NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ebay_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `ebay_tokens_userId_unique` UNIQUE(`userId`)
);
