import { eq, desc, and, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import {
  InsertUser, users, items, listings, listingTemplates, priceAlerts,
  Item, InsertItem, Listing, InsertListing, ListingTemplate,
  InsertListingTemplate, PriceAlert, InsertPriceAlert,
} from "../drizzle/schema";
import type { WorkerEnv } from "./_core/env";

function getDb(env: WorkerEnv) {
  return drizzle(env.DB);
}

function now(): string {
  return new Date().toISOString();
}

// ── Users ──────────────────────────────────────────────────────────────────

export async function upsertUser(env: WorkerEnv, user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = getDb(env);

  const nowStr = now();
  const existing = await getUserByOpenId(env, user.openId);

  if (existing) {
    const updateSet: Record<string, unknown> = { updatedAt: nowStr };
    if (user.name !== undefined) updateSet.name = user.name ?? null;
    if (user.email !== undefined) updateSet.email = user.email ?? null;
    if (user.loginMethod !== undefined) updateSet.loginMethod = user.loginMethod ?? null;
    if (user.lastSignedIn !== undefined) updateSet.lastSignedIn = user.lastSignedIn;
    else updateSet.lastSignedIn = nowStr;
    if (user.role !== undefined) updateSet.role = user.role;
    else if (user.openId === env.OWNER_OPEN_ID) updateSet.role = "admin";

    await db.update(users).set(updateSet).where(eq(users.openId, user.openId));
  } else {
    const insertValues: InsertUser = {
      openId: user.openId,
      name: user.name ?? null,
      email: user.email ?? null,
      loginMethod: user.loginMethod ?? null,
      lastSignedIn: user.lastSignedIn ?? nowStr,
      role: user.role ?? (user.openId === env.OWNER_OPEN_ID ? "admin" : "user"),
      createdAt: nowStr,
      updatedAt: nowStr,
    };
    await db.insert(users).values(insertValues);
  }
}

export async function getUserByOpenId(env: WorkerEnv, openId: string) {
  const db = getDb(env);
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ── Items ──────────────────────────────────────────────────────────────────

export async function createItem(env: WorkerEnv, data: InsertItem): Promise<number> {
  const db = getDb(env);
  const result = await db.insert(items).values({ ...data, createdAt: now(), updatedAt: now() }).returning({ id: items.id });
  return result[0].id;
}

export async function getItemById(env: WorkerEnv, id: number, userId: number): Promise<Item | undefined> {
  const db = getDb(env);
  const result = await db.select().from(items).where(and(eq(items.id, id), eq(items.userId, userId))).limit(1);
  return result[0];
}

export async function updateItem(env: WorkerEnv, id: number, userId: number, data: Partial<InsertItem>): Promise<void> {
  const db = getDb(env);
  await db.update(items).set({ ...data, updatedAt: now() }).where(and(eq(items.id, id), eq(items.userId, userId)));
}

export async function listItems(env: WorkerEnv, userId: number, limit = 20, offset = 0): Promise<Item[]> {
  const db = getDb(env);
  return db.select().from(items).where(eq(items.userId, userId)).orderBy(desc(items.createdAt)).limit(limit).offset(offset);
}

export async function getItemStats(env: WorkerEnv, userId: number) {
  const db = getDb(env);
  const [itemCount] = await db.select({ count: sql<number>`count(*)` }).from(items).where(eq(items.userId, userId));
  const [listingCount] = await db.select({ count: sql<number>`count(*)` }).from(listings).where(eq(listings.userId, userId));
  const [soldCount] = await db.select({ count: sql<number>`count(*)` }).from(items).where(and(eq(items.userId, userId), eq(items.status, "sold")));
  return {
    totalItems: Number(itemCount?.count ?? 0),
    totalListings: Number(listingCount?.count ?? 0),
    soldItems: Number(soldCount?.count ?? 0),
  };
}

// ── Listings ───────────────────────────────────────────────────────────────

export async function createListing(env: WorkerEnv, data: InsertListing): Promise<number> {
  const db = getDb(env);
  const result = await db.insert(listings).values({ ...data, createdAt: now(), updatedAt: now() }).returning({ id: listings.id });
  return result[0].id;
}

export async function getListingById(env: WorkerEnv, id: number, userId: number): Promise<Listing | undefined> {
  const db = getDb(env);
  const result = await db.select().from(listings).where(and(eq(listings.id, id), eq(listings.userId, userId))).limit(1);
  return result[0];
}

export async function updateListing(env: WorkerEnv, id: number, userId: number, data: Partial<InsertListing>): Promise<void> {
  const db = getDb(env);
  await db.update(listings).set({ ...data, updatedAt: now() }).where(and(eq(listings.id, id), eq(listings.userId, userId)));
}

export async function listListings(env: WorkerEnv, userId: number, limit = 20, offset = 0): Promise<Listing[]> {
  const db = getDb(env);
  return db.select().from(listings).where(eq(listings.userId, userId)).orderBy(desc(listings.createdAt)).limit(limit).offset(offset);
}

export async function listListingsByItem(env: WorkerEnv, itemId: number, userId: number): Promise<Listing[]> {
  const db = getDb(env);
  return db.select().from(listings).where(and(eq(listings.itemId, itemId), eq(listings.userId, userId)));
}

export async function getListingByShareToken(env: WorkerEnv, token: string): Promise<Listing | undefined> {
  const db = getDb(env);
  const result = await db.select().from(listings).where(eq(listings.trackingShareToken, token)).limit(1);
  return result[0];
}

export async function getProfitStats(env: WorkerEnv, userId: number) {
  const db = getDb(env);
  const soldItems = await db.select({
    thriftCost: items.thriftCost,
    soldPrice: items.soldPrice,
  }).from(items).where(and(eq(items.userId, userId), eq(items.status, "sold")));

  let totalCost = 0, totalRevenue = 0;
  for (const item of soldItems) {
    totalCost += Number(item.thriftCost ?? 0);
    totalRevenue += Number(item.soldPrice ?? 0);
  }
  return {
    totalProfit: totalRevenue - totalCost,
    totalCost,
    totalRevenue,
    soldCount: soldItems.length,
  };
}

// ── Templates ──────────────────────────────────────────────────────────────

export async function createTemplate(env: WorkerEnv, data: InsertListingTemplate): Promise<number> {
  const db = getDb(env);
  const result = await db.insert(listingTemplates).values({ ...data, createdAt: now(), updatedAt: now() }).returning({ id: listingTemplates.id });
  return result[0].id;
}

export async function getTemplateById(env: WorkerEnv, id: number, userId: number): Promise<ListingTemplate | undefined> {
  const db = getDb(env);
  const result = await db.select().from(listingTemplates).where(and(eq(listingTemplates.id, id), eq(listingTemplates.userId, userId))).limit(1);
  return result[0];
}

export async function updateTemplate(env: WorkerEnv, id: number, userId: number, data: Partial<InsertListingTemplate>): Promise<void> {
  const db = getDb(env);
  await db.update(listingTemplates).set({ ...data, updatedAt: now() }).where(and(eq(listingTemplates.id, id), eq(listingTemplates.userId, userId)));
}

export async function deleteTemplate(env: WorkerEnv, id: number, userId: number): Promise<void> {
  const db = getDb(env);
  await db.delete(listingTemplates).where(and(eq(listingTemplates.id, id), eq(listingTemplates.userId, userId)));
}

export async function listTemplates(env: WorkerEnv, userId: number): Promise<ListingTemplate[]> {
  const db = getDb(env);
  return db.select().from(listingTemplates).where(eq(listingTemplates.userId, userId)).orderBy(desc(listingTemplates.usageCount));
}

export async function incrementTemplateUsage(env: WorkerEnv, id: number): Promise<void> {
  const db = getDb(env);
  await db.update(listingTemplates).set({ usageCount: sql`${listingTemplates.usageCount} + 1`, updatedAt: now() }).where(eq(listingTemplates.id, id));
}

// ── Price Alerts ───────────────────────────────────────────────────────────

export async function createAlert(env: WorkerEnv, data: InsertPriceAlert): Promise<number> {
  const db = getDb(env);
  const result = await db.insert(priceAlerts).values({ ...data, createdAt: now(), updatedAt: now() }).returning({ id: priceAlerts.id });
  return result[0].id;
}

export async function updateAlert(env: WorkerEnv, id: number, userId: number, data: Partial<InsertPriceAlert>): Promise<void> {
  const db = getDb(env);
  await db.update(priceAlerts).set({ ...data, updatedAt: now() }).where(and(eq(priceAlerts.id, id), eq(priceAlerts.userId, userId)));
}

export async function deleteAlert(env: WorkerEnv, id: number, userId: number): Promise<void> {
  const db = getDb(env);
  await db.delete(priceAlerts).where(and(eq(priceAlerts.id, id), eq(priceAlerts.userId, userId)));
}

export async function listAlerts(env: WorkerEnv, userId: number): Promise<PriceAlert[]> {
  const db = getDb(env);
  return db.select().from(priceAlerts).where(eq(priceAlerts.userId, userId)).orderBy(desc(priceAlerts.createdAt));
}


