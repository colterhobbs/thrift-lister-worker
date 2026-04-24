-- ThriftLister D1 Initial Migration
-- Run via: wrangler d1 migrations apply thrift-lister

CREATE TABLE IF NOT EXISTS `users` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `openId` text(64) NOT NULL UNIQUE,
  `name` text,
  `email` text,
  `loginMethod` text,
  `role` text NOT NULL DEFAULT 'user',
  `createdAt` text NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  `updatedAt` text NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  `lastSignedIn` text NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS `items` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `userId` integer NOT NULL,
  `imageUrl` text,
  `imageUrls` text,
  `userDescription` text,
  `manualDescription` text,
  `identifiedName` text,
  `identifiedBrand` text,
  `identifiedCategory` text,
  `identifiedCondition` text,
  `aiDescription` text,
  `aiTags` text,
  `suggestedPrice` real,
  `priceMin` real,
  `priceMax` real,
  `pricingData` text,
  `thriftCost` real,
  `soldPrice` real,
  `soldAt` text,
  `status` text NOT NULL DEFAULT 'researching',
  `createdAt` text NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  `updatedAt` text NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS `listings` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `userId` integer NOT NULL,
  `itemId` integer NOT NULL,
  `title` text NOT NULL,
  `description` text NOT NULL,
  `price` real NOT NULL,
  `category` text,
  `tags` text,
  `condition` text,
  `imageUrl` text,
  `etsyStatus` text NOT NULL DEFAULT 'not_posted',
  `etsyListingId` text,
  `etsyUrl` text,
  `ebayStatus` text NOT NULL DEFAULT 'not_posted',
  `ebayListingId` text,
  `ebayUrl` text,
  `fbStatus` text NOT NULL DEFAULT 'not_posted',
  `fbListingId` text,
  `fbUrl` text,
  `trackingNumber` text,
  `trackingCarrier` text,
  `trackingStatus` text,
  `trackingLastUpdate` text,
  `trackingUpdatedAt` text,
  `trackingShareToken` text,
  `buyerName` text,
  `buyerEmail` text,
  `createdAt` text NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  `updatedAt` text NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS `listing_templates` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `userId` integer NOT NULL,
  `name` text NOT NULL,
  `category` text,
  `descriptionTemplate` text,
  `tags` text,
  `defaultPlatforms` text,
  `notes` text,
  `usageCount` integer NOT NULL DEFAULT 0,
  `createdAt` text NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  `updatedAt` text NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS `price_alerts` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `userId` integer NOT NULL,
  `itemId` integer,
  `keyword` text NOT NULL,
  `category` text,
  `baselinePrice` real,
  `thresholdPercent` integer NOT NULL DEFAULT 20,
  `isActive` integer NOT NULL DEFAULT 1,
  `lastCheckedAt` text,
  `lastAlertAt` text,
  `createdAt` text NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  `updatedAt` text NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS `ebay_tokens` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `userId` integer NOT NULL UNIQUE,
  `accessToken` text NOT NULL,
  `refreshToken` text NOT NULL,
  `accessTokenExpiresAt` integer NOT NULL,
  `refreshTokenExpiresAt` integer NOT NULL,
  `createdAt` text NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  `updatedAt` text NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS `etsy_tokens` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `userId` integer NOT NULL UNIQUE,
  `accessToken` text NOT NULL,
  `refreshToken` text NOT NULL,
  `accessTokenExpiresAt` integer NOT NULL,
  `shopId` integer,
  `shopName` text,
  `createdAt` text NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  `updatedAt` text NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
