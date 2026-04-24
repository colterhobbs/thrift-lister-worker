import {
  integer,
  sqliteTable,
  text,
  real,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ── Users ──────────────────────────────────────────────────────────────────

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  openId: text("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: text("email"),
  loginMethod: text("loginMethod"),
  role: text("role", { enum: ["user", "admin"] }).default("user").notNull(),
  createdAt: text("createdAt").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  updatedAt: text("updatedAt").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  lastSignedIn: text("lastSignedIn").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ── Items ──────────────────────────────────────────────────────────────────

export const items = sqliteTable("items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  imageUrl: text("imageUrl"),
  imageUrls: text("imageUrls"),
  userDescription: text("userDescription"),
  manualDescription: text("manualDescription"),
  identifiedName: text("identifiedName"),
  identifiedBrand: text("identifiedBrand"),
  identifiedCategory: text("identifiedCategory"),
  identifiedCondition: text("identifiedCondition"),
  aiDescription: text("aiDescription"),
  aiTags: text("aiTags"),
  suggestedPrice: real("suggestedPrice"),
  priceMin: real("priceMin"),
  priceMax: real("priceMax"),
  pricingData: text("pricingData"),
  thriftCost: real("thriftCost"),
  soldPrice: real("soldPrice"),
  soldAt: text("soldAt"),
  status: text("status", { enum: ["researching", "ready", "listed", "sold", "archived"] }).default("researching").notNull(),
  createdAt: text("createdAt").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  updatedAt: text("updatedAt").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

export type Item = typeof items.$inferSelect;
export type InsertItem = typeof items.$inferInsert;

// ── Listings ───────────────────────────────────────────────────────────────

export const listings = sqliteTable("listings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  itemId: integer("itemId").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  price: real("price").notNull(),
  category: text("category"),
  tags: text("tags"),
  condition: text("condition"),
  imageUrl: text("imageUrl"),
  etsyStatus: text("etsyStatus", { enum: ["not_posted", "pending", "posted", "failed"] }).default("not_posted").notNull(),
  etsyListingId: text("etsyListingId"),
  etsyUrl: text("etsyUrl"),
  ebayStatus: text("ebayStatus", { enum: ["not_posted", "pending", "posted", "failed"] }).default("not_posted").notNull(),
  ebayListingId: text("ebayListingId"),
  ebayUrl: text("ebayUrl"),
  fbStatus: text("fbStatus", { enum: ["not_posted", "pending", "posted", "failed"] }).default("not_posted").notNull(),
  fbListingId: text("fbListingId"),
  fbUrl: text("fbUrl"),
  trackingNumber: text("trackingNumber"),
  trackingCarrier: text("trackingCarrier"),
  trackingStatus: text("trackingStatus"),
  trackingLastUpdate: text("trackingLastUpdate"),
  trackingUpdatedAt: text("trackingUpdatedAt"),
  trackingShareToken: text("trackingShareToken"),
  buyerName: text("buyerName"),
  buyerEmail: text("buyerEmail"),
  createdAt: text("createdAt").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  updatedAt: text("updatedAt").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

export type Listing = typeof listings.$inferSelect;
export type InsertListing = typeof listings.$inferInsert;

// ── Listing Templates ──────────────────────────────────────────────────────

export const listingTemplates = sqliteTable("listing_templates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  name: text("name").notNull(),
  category: text("category"),
  descriptionTemplate: text("descriptionTemplate"),
  tags: text("tags"),
  defaultPlatforms: text("defaultPlatforms"),
  notes: text("notes"),
  usageCount: integer("usageCount").default(0).notNull(),
  createdAt: text("createdAt").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  updatedAt: text("updatedAt").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

export type ListingTemplate = typeof listingTemplates.$inferSelect;
export type InsertListingTemplate = typeof listingTemplates.$inferInsert;

// ── Price Alerts ───────────────────────────────────────────────────────────

export const priceAlerts = sqliteTable("price_alerts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  itemId: integer("itemId"),
  keyword: text("keyword").notNull(),
  category: text("category"),
  baselinePrice: real("baselinePrice"),
  thresholdPercent: integer("thresholdPercent").default(20).notNull(),
  isActive: integer("isActive", { mode: "boolean" }).default(true).notNull(),
  lastCheckedAt: text("lastCheckedAt"),
  lastAlertAt: text("lastAlertAt"),
  createdAt: text("createdAt").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  updatedAt: text("updatedAt").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

export type PriceAlert = typeof priceAlerts.$inferSelect;
export type InsertPriceAlert = typeof priceAlerts.$inferInsert;

// ── eBay Tokens ────────────────────────────────────────────────────────────

export const ebayTokens = sqliteTable("ebay_tokens", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull().unique(),
  accessToken: text("accessToken").notNull(),
  refreshToken: text("refreshToken").notNull(),
  accessTokenExpiresAt: integer("accessTokenExpiresAt").notNull(),
  refreshTokenExpiresAt: integer("refreshTokenExpiresAt").notNull(),
  createdAt: text("createdAt").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  updatedAt: text("updatedAt").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

export type EbayToken = typeof ebayTokens.$inferSelect;
export type InsertEbayToken = typeof ebayTokens.$inferInsert;

// ── Etsy Tokens ────────────────────────────────────────────────────────────

export const etsyTokens = sqliteTable("etsy_tokens", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull().unique(),
  accessToken: text("accessToken").notNull(),
  refreshToken: text("refreshToken").notNull(),
  accessTokenExpiresAt: integer("accessTokenExpiresAt").notNull(),
  shopId: integer("shopId"),
  shopName: text("shopName"),
  createdAt: text("createdAt").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  updatedAt: text("updatedAt").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

export type EtsyToken = typeof etsyTokens.$inferSelect;
export type InsertEtsyToken = typeof etsyTokens.$inferInsert;
