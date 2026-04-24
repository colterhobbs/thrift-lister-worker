ALTER TABLE `items` ADD `thriftCost` decimal(10,2);--> statement-breakpoint
ALTER TABLE `items` ADD `soldPrice` decimal(10,2);--> statement-breakpoint
ALTER TABLE `items` ADD `soldAt` timestamp;--> statement-breakpoint
ALTER TABLE `listings` ADD `trackingNumber` text;--> statement-breakpoint
ALTER TABLE `listings` ADD `trackingCarrier` text;--> statement-breakpoint
ALTER TABLE `listings` ADD `trackingStatus` text;--> statement-breakpoint
ALTER TABLE `listings` ADD `trackingLastUpdate` text;--> statement-breakpoint
ALTER TABLE `listings` ADD `trackingUpdatedAt` timestamp;--> statement-breakpoint
ALTER TABLE `listings` ADD `trackingShareToken` varchar(64);--> statement-breakpoint
ALTER TABLE `listings` ADD `buyerName` text;--> statement-breakpoint
ALTER TABLE `listings` ADD `buyerEmail` text;