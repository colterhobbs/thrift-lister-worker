import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the database helpers
vi.mock("./db", () => ({
  getItemStats: vi.fn().mockResolvedValue({ total: 5, researched: 3, listed: 1, sold: 1 }),
  listItems: vi.fn().mockResolvedValue([
    {
      id: 1,
      userId: 1,
      status: "ready",
      imageUrl: null,
      manualDescription: "Vintage Nike jacket",
      identifiedName: "Nike Windbreaker",
      identifiedBrand: "Nike",
      identifiedCategory: "Clothing",
      identifiedCondition: "Good",
      aiDescription: "A classic Nike windbreaker",
      aiTags: '["nike","vintage","jacket"]',
      suggestedPrice: "45.00",
      priceMin: "30.00",
      priceMax: "65.00",
      pricingData: "[]",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
  getItemById: vi.fn().mockResolvedValue({
    id: 1,
    userId: 1,
    status: "ready",
    imageUrl: null,
    manualDescription: "Vintage Nike jacket",
    identifiedName: "Nike Windbreaker",
    identifiedBrand: "Nike",
    identifiedCategory: "Clothing",
    identifiedCondition: "Good",
    aiDescription: "A classic Nike windbreaker",
    aiTags: '["nike","vintage","jacket"]',
    suggestedPrice: "45.00",
    priceMin: "30.00",
    priceMax: "65.00",
    pricingData: "[]",
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  createItem: vi.fn().mockResolvedValue(1),
  updateItem: vi.fn().mockResolvedValue(undefined),
  listListings: vi.fn().mockResolvedValue([]),
  createListing: vi.fn().mockResolvedValue(1),
  getListingById: vi.fn().mockResolvedValue({
    id: 1,
    userId: 1,
    itemId: 1,
    title: "Nike Windbreaker",
    description: "A classic jacket",
    price: "45.00",
    trackingNumber: null,
    trackingCarrier: null,
    trackingStatus: null,
    trackingLastUpdate: null,
    trackingUpdatedAt: null,
    trackingShareToken: null,
    buyerName: null,
    buyerEmail: null,
    etsyStatus: "not_posted",
    ebayStatus: "not_posted",
    fbStatus: "not_posted",
    etsyListingId: null,
    etsyUrl: null,
    ebayListingId: null,
    ebayUrl: null,
    fbListingId: null,
    fbUrl: null,
    imageUrl: null,
    category: null,
    tags: null,
    condition: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  getListingByShareToken: vi.fn().mockResolvedValue({
    id: 1,
    title: "Nike Windbreaker",
    trackingNumber: "9400111899223408527401",
    trackingCarrier: "USPS",
    trackingStatus: "In Transit",
    trackingLastUpdate: "Departed USPS Regional Facility",
    trackingUpdatedAt: new Date(),
    buyerName: "Jane Smith",
    imageUrl: null,
  }),
  getProfitStats: vi.fn().mockResolvedValue({ totalProfit: 120, totalCost: 30, totalRevenue: 150, soldCount: 3 }),
  listListingsByItem: vi.fn().mockResolvedValue([]),
  incrementTemplateUsage: vi.fn().mockResolvedValue(undefined),
  updateListing: vi.fn().mockResolvedValue(undefined),
  listTemplates: vi.fn().mockResolvedValue([]),
  createTemplate: vi.fn().mockResolvedValue(1),
  updateTemplate: vi.fn().mockResolvedValue(undefined),
  deleteTemplate: vi.fn().mockResolvedValue(undefined),
  listAlerts: vi.fn().mockResolvedValue([]),
  createAlert: vi.fn().mockResolvedValue(1),
  updateAlert: vi.fn().mockResolvedValue(undefined),
  deleteAlert: vi.fn().mockResolvedValue(undefined),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn().mockResolvedValue(null),
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ url: "https://example.com/image.jpg", key: "test/image.jpg" }),
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: JSON.stringify({
            name: "Nike Windbreaker",
            brand: "Nike",
            category: "Clothing",
            condition: "Good",
            description: "A classic vintage Nike windbreaker jacket.",
            tags: ["nike", "vintage", "jacket", "windbreaker"],
            estimatedEra: "1990s",
            uniqueFeatures: "Original Nike swoosh logo",
            confidence: 0.92,
          }),
        },
        finish_reason: "stop",
        index: 0,
      },
    ],
  }),
}));

function createMockContext(overrides?: Partial<TrpcContext>): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user-123",
      name: "Test User",
      email: "test@example.com",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
    ...overrides,
  };
}

describe("items router", () => {
  it("stats returns item counts", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.items.stats();
    expect(result).toMatchObject({ total: 5, researched: 3, listed: 1, sold: 1 });
  });

  it("list returns formatted items", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.items.list({ limit: 10, offset: 0 });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    const item = result[0];
    expect(item).toHaveProperty("id");
    expect(item).toHaveProperty("identifiedName");
    expect(Array.isArray(item.aiTags)).toBe(true);
  });

  it("list parses aiTags from JSON string", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.items.list({ limit: 10, offset: 0 });
    const item = result[0];
    expect(Array.isArray(item.aiTags)).toBe(true);
    expect(item.aiTags).toContain("nike");
  });

  it("get returns single item by id", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.items.get({ id: 1 });
    expect(result).toHaveProperty("id", 1);
    expect(result).toHaveProperty("identifiedName", "Nike Windbreaker");
    expect(Array.isArray(result.aiTags)).toBe(true);
  });

  it("list returns suggestedPrice as string", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.items.list({ limit: 10, offset: 0 });
    const item = result[0];
    expect(typeof item.suggestedPrice).toBe("string");
    expect(item.suggestedPrice).toBe("45.00");
  });
});

describe("templates router", () => {
  it("list returns empty array when no templates", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.templates.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("listings router", () => {
  it("list returns empty array when no listings", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.listings.list({ limit: 10 });
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("alerts router", () => {
  it("list returns empty array when no alerts", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.alerts.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("items new procedures", () => {
  it("markSold updates item status to sold", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.items.markSold({ id: 1, soldPrice: "55.00", thriftCost: "5.00" });
    expect(result).toEqual({ success: true });
  });

  it("updateCost saves thrift cost for an item", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.items.updateCost({ id: 1, thriftCost: "3.50" });
    expect(result).toEqual({ success: true });
  });

  it("profitStats returns profit summary", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.items.profitStats();
    expect(result).toMatchObject({ totalProfit: 120, soldCount: 3 });
  });

  it("quickSell creates item and returns itemId", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.items.quickSell({ description: "Vintage lamp", thriftCost: "2.00" });
    expect(result).toHaveProperty("itemId");
    expect(typeof result.itemId).toBe("number");
  });
});

describe("listings tracking procedures", () => {
  it("updateTracking saves tracking info and returns shareToken", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.listings.updateTracking({
      id: 1,
      trackingNumber: "9400111899223408527401",
      trackingCarrier: "USPS",
      buyerName: "Jane Smith",
    });
    expect(result).toHaveProperty("success", true);
    expect(result).toHaveProperty("shareToken");
    expect(typeof result.shareToken).toBe("string");
  });

  it("getByShareToken returns public tracking info", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.listings.getByShareToken({ token: "test-token-abc" });
    expect(result).toHaveProperty("trackingNumber", "9400111899223408527401");
    expect(result).toHaveProperty("trackingCarrier", "USPS");
    expect(result).toHaveProperty("buyerName", "Jane Smith");
    // Should NOT expose sensitive fields
    expect(result).not.toHaveProperty("userId");
  });
});

describe("auth router", () => {
  it("me returns current user", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toHaveProperty("id", 1);
    expect(result).toHaveProperty("email", "test@example.com");
  });

  it("logout clears session cookie", async () => {
    const clearedCookies: string[] = [];
    const ctx = createMockContext({
      res: {
        clearCookie: (name: string) => clearedCookies.push(name),
      } as unknown as TrpcContext["res"],
    });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies.length).toBeGreaterThan(0);
  });
});
