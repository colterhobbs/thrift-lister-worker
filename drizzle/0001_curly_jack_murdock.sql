CREATE TABLE `items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`imageUrl` text,
	`manualDescription` text,
	`identifiedName` text,
	`identifiedBrand` text,
	`identifiedCategory` text,
	`identifiedCondition` text,
	`aiDescription` text,
	`aiTags` text,
	`suggestedPrice` decimal(10,2),
	`priceMin` decimal(10,2),
	`priceMax` decimal(10,2),
	`pricingData` text,
	`status` enum('researching','ready','listed','sold','archived') NOT NULL DEFAULT 'researching',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `listing_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` text,
	`descriptionTemplate` text,
	`tags` text,
	`defaultPlatforms` text,
	`notes` text,
	`usageCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `listing_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `listings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`itemId` int NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`price` decimal(10,2) NOT NULL,
	`category` text,
	`tags` text,
	`condition` text,
	`imageUrl` text,
	`etsyStatus` enum('not_posted','pending','posted','failed') NOT NULL DEFAULT 'not_posted',
	`etsyListingId` text,
	`etsyUrl` text,
	`ebayStatus` enum('not_posted','pending','posted','failed') NOT NULL DEFAULT 'not_posted',
	`ebayListingId` text,
	`ebayUrl` text,
	`fbStatus` enum('not_posted','pending','posted','failed') NOT NULL DEFAULT 'not_posted',
	`fbListingId` text,
	`fbUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `listings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `price_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`itemId` int,
	`keyword` text NOT NULL,
	`category` text,
	`baselinePrice` decimal(10,2),
	`thresholdPercent` int NOT NULL DEFAULT 20,
	`isActive` boolean NOT NULL DEFAULT true,
	`lastCheckedAt` timestamp,
	`lastAlertAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `price_alerts_id` PRIMARY KEY(`id`)
);
