import { COOKIE_NAME } from "@shared/const";
import { buildClearCookieHeader } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { invokeLLM, type Message } from "./_core/llm";
import { storagePut } from "./storage";
import {
  createItem, getItemById, updateItem, listItems, getItemStats,
  createListing, getListingById, updateListing, listListings, listListingsByItem,
  getListingByShareToken, getProfitStats,
  createTemplate, getTemplateById, updateTemplate, deleteTemplate, listTemplates, incrementTemplateUsage,
  createAlert, updateAlert, deleteAlert, listAlerts,
} from "./db";
import { drizzle } from "drizzle-orm/d1";
import { items, listings, etsyTokens } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import {
  getEbayAuthUrl,
  exchangeCodeForToken,
  upsertEbayToken,
  getEbayStatus,
  getValidAccessToken,
  addEbayListing,
  getActiveListings,
  getSoldListings,
} from "./ebay";
import {
  getEtsyAuthUrl,
  exchangeEtsyCode,
  refreshEtsyToken,
  getMyShop,
  createEtsyDraftListing,
  hasEtsyCredentials,
} from "./etsy";

// Type cast helper for multi-modal messages
const msgs = (m: any[]): any => m;

// ── Helpers ────────────────────────────────────────────────────────────────

function parseJsonField<T>(val: string | null | undefined, fallback: T): T {
  if (!val) return fallback;
  try { return JSON.parse(val) as T; } catch { return fallback; }
}

// ── eBay pricing research via AI simulation ────────────────────────────────
// Since direct eBay API requires OAuth credentials, we use AI to simulate
// realistic pricing data based on known market knowledge.

async function researchPricing(env: import("./_core/env").WorkerEnv, itemName: string, brand: string, category: string, condition: string) {
  const result = await invokeLLM(env, {
    messages: [
      {
        role: "system",
        content: `You are an expert resale pricing analyst with deep knowledge of eBay, Etsy, and Facebook Marketplace sold listings. 
        When given an item, provide realistic market pricing data based on actual typical sold prices for that item type.
        Always respond with valid JSON only.`,
      },
      {
        role: "user",
        content: `Research the resale market value for this item:
Item: ${itemName}
Brand: ${brand || "Unknown"}
Category: ${category || "General"}
Condition: ${condition || "Good"}

Provide realistic pricing data as if you looked up recent eBay sold listings. Return JSON:
{
  "suggestedPrice": number (recommended listing price),
  "priceMin": number (low end of sold prices),
  "priceMax": number (high end of sold prices),
  "comparables": [
    { "title": string, "price": number, "platform": "eBay"|"Etsy"|"Facebook", "soldDate": string, "condition": string }
  ] (5-8 realistic comparable sold listings),
  "pricingNotes": string (brief explanation of pricing strategy)
}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "pricing_research",
        strict: true,
        schema: {
          type: "object",
          properties: {
            suggestedPrice: { type: "number" },
            priceMin: { type: "number" },
            priceMax: { type: "number" },
            comparables: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  price: { type: "number" },
                  platform: { type: "string" },
                  soldDate: { type: "string" },
                  condition: { type: "string" },
                },
                required: ["title", "price", "platform", "soldDate", "condition"],
                additionalProperties: false,
              },
            },
            pricingNotes: { type: "string" },
          },
          required: ["suggestedPrice", "priceMin", "priceMax", "comparables", "pricingNotes"],
          additionalProperties: false,
        },
      },
    },
  });
  const content = (result.choices[0]?.message?.content as string) ?? "{}";
  return JSON.parse(content);
}

// ── Items Router ───────────────────────────────────────────────────────────

const itemsRouter = router({
  stats: protectedProcedure.query(async ({ ctx }) => {
    return getItemStats(ctx.env, ctx.user.id);
  }),

  list: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(20), offset: z.number().default(0) }))
    .query(async ({ ctx, input }) => {
      const rows = await listItems(ctx.env, ctx.user.id, input.limit, input.offset);
      return rows.map(r => ({
        ...r,
        aiTags: parseJsonField<string[]>(r.aiTags, []),
        pricingData: parseJsonField<unknown[]>(r.pricingData, []),
        suggestedPrice: r.suggestedPrice ? String(r.suggestedPrice) : null,
        priceMin: r.priceMin ? String(r.priceMin) : null,
        priceMax: r.priceMax ? String(r.priceMax) : null,
      }));
    }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const item = await getItemById(ctx.env, input.id, ctx.user.id);
      if (!item) throw new Error("Item not found");
      return {
        ...item,
        aiTags: parseJsonField<string[]>(item.aiTags, []),
        pricingData: parseJsonField<unknown[]>(item.pricingData, []),
        suggestedPrice: item.suggestedPrice ? String(item.suggestedPrice) : null,
        priceMin: item.priceMin ? String(item.priceMin) : null,
        priceMax: item.priceMax ? String(item.priceMax) : null,
      };
    }),

  // Upload image to S3 and return URL
  uploadImage: protectedProcedure
    .input(z.object({ base64: z.string(), mimeType: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const binaryStr = atob(input.base64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
      const ext = input.mimeType.split("/")[1] ?? "jpg";
      const key = `items/${ctx.user.id}/${nanoid()}.${ext}`;
      const { url } = await storagePut(ctx.env, key, bytes, input.mimeType);
      return { url };
    }),

  // Identify item from image URL using AI vision
  identifyFromImage: protectedProcedure
    .input(z.object({ imageUrl: z.string().url(), manualHint: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const messages: any[] = [
        {
          role: "system",
          content: `You are an expert thrift store item identifier and resale specialist. 
          Analyze images to identify items with precision. Always respond with valid JSON only.`,
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: input.imageUrl, detail: "high" },
            },
            {
              type: "text",
              text: `Identify this thrift store item${input.manualHint ? ` (hint: ${input.manualHint})` : ""}. 
              Return JSON with:
              {
                "name": string (specific product name),
                "brand": string (brand/manufacturer or "Unknown"),
                "category": string (e.g. "Clothing", "Electronics", "Home Decor", "Books", "Toys", "Jewelry", "Sports", "Vintage", "Art"),
                "condition": string ("Excellent"|"Very Good"|"Good"|"Fair"|"Poor"),
                "description": string (2-3 sentence detailed description for a listing),
                "tags": string[] (8-12 relevant search tags),
                "estimatedEra": string (decade/era if applicable, e.g. "1990s", "Victorian", "Modern"),
                "uniqueFeatures": string (notable features that add value),
                "confidence": number (0-1, how confident you are in the identification)
              }`,
            },
          ],
        },
      ];

      const result = await invokeLLM(ctx.env, {
        messages,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "item_identification",
            strict: true,
            schema: {
              type: "object",
              properties: {
                name: { type: "string" },
                brand: { type: "string" },
                category: { type: "string" },
                condition: { type: "string" },
                description: { type: "string" },
                tags: { type: "array", items: { type: "string" } },
                estimatedEra: { type: "string" },
                uniqueFeatures: { type: "string" },
                confidence: { type: "number" },
              },
              required: ["name", "brand", "category", "condition", "description", "tags", "estimatedEra", "uniqueFeatures", "confidence"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = (result.choices[0]?.message?.content as string) ?? "{}";
      return JSON.parse(content);
    }),

  // Identify from manual description
  identifyFromDescription: protectedProcedure
    .input(z.object({ description: z.string().min(3) }))
    .mutation(async ({ input }) => {
      const result = await invokeLLM(ctx.env, {
        messages: [
          {
            role: "system",
            content: "You are an expert thrift store item identifier. Always respond with valid JSON only.",
          },
          {
            role: "user",
            content: `Identify this thrift store item from the description: "${input.description}"
            Return JSON:
            {
              "name": string,
              "brand": string,
              "category": string,
              "condition": string ("Excellent"|"Very Good"|"Good"|"Fair"|"Poor"),
              "description": string (2-3 sentence listing description),
              "tags": string[] (8-12 tags),
              "estimatedEra": string,
              "uniqueFeatures": string,
              "confidence": number
            }`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "item_identification",
            strict: true,
            schema: {
              type: "object",
              properties: {
                name: { type: "string" },
                brand: { type: "string" },
                category: { type: "string" },
                condition: { type: "string" },
                description: { type: "string" },
                tags: { type: "array", items: { type: "string" } },
                estimatedEra: { type: "string" },
                uniqueFeatures: { type: "string" },
                confidence: { type: "number" },
              },
              required: ["name", "brand", "category", "condition", "description", "tags", "estimatedEra", "uniqueFeatures", "confidence"],
              additionalProperties: false,
            },
          },
        },
      });
      const content = (result.choices[0]?.message?.content as string) ?? "{}";
      return JSON.parse(content);
    }),

  // Research pricing for an identified item
  researchPricing: protectedProcedure
    .input(z.object({ itemId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const item = await getItemById(ctx.env, input.itemId, ctx.user.id);
      if (!item) throw new Error("Item not found");

      const pricing = await researchPricing(ctx.env, 
        item.identifiedName ?? item.manualDescription ?? "Unknown item",
        item.identifiedBrand ?? "",
        item.identifiedCategory ?? "",
        item.identifiedCondition ?? "Good",
      );

      await updateItem(ctx.env, input.itemId, ctx.user.id, {
        suggestedPrice: pricing.suggestedPrice.toString(),
        priceMin: pricing.priceMin.toString(),
        priceMax: pricing.priceMax.toString(),
        pricingData: JSON.stringify({ comparables: pricing.comparables, notes: pricing.pricingNotes }),
        status: "ready",
      });

      return pricing;
    }),

  // Create item from image
  createFromImage: protectedProcedure
    .input(z.object({
      imageUrl: z.string().url(),
      imageUrls: z.array(z.string().url()).optional(),
      userDescription: z.string().optional(),
      manualHint: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const allImageUrls = input.imageUrls?.length ? input.imageUrls : [input.imageUrl];
      // First create a placeholder item
      const itemId = await createItem(ctx.env, {
        userId: ctx.user.id,
        imageUrl: input.imageUrl,
        imageUrls: JSON.stringify(allImageUrls),
        userDescription: input.userDescription,
        status: "researching",
      });

      // Identify the item — use all uploaded images for better accuracy
      const identification = await (async () => {
        const imageContents = allImageUrls.map(url => ({
          type: "image_url" as const,
          image_url: { url, detail: "high" as const },
        }));
        const hintParts = [
          input.userDescription ? `User notes: ${input.userDescription}` : "",
          input.manualHint ? `Hint: ${input.manualHint}` : "",
        ].filter(Boolean);
        const hintText = hintParts.length ? ` (${hintParts.join(". ")})` : "";
        const imgMsgs = [
          { role: "system" as const, content: "You are an expert thrift store item identifier. Always respond with valid JSON only." },
          { role: "user" as const, content: [
            ...imageContents,
            { type: "text" as const, text: `Identify this thrift store item${hintText}. Return JSON: { "name": string, "brand": string, "category": string, "condition": string, "description": string, "tags": string[], "estimatedEra": string, "uniqueFeatures": string, "confidence": number }` },
          ] as any },
        ];
        const result = await invokeLLM(ctx.env, {
          messages: imgMsgs as any,
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "item_identification",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" }, brand: { type: "string" }, category: { type: "string" },
                  condition: { type: "string" }, description: { type: "string" },
                  tags: { type: "array", items: { type: "string" } },
                  estimatedEra: { type: "string" }, uniqueFeatures: { type: "string" }, confidence: { type: "number" },
                },
                required: ["name", "brand", "category", "condition", "description", "tags", "estimatedEra", "uniqueFeatures", "confidence"],
                additionalProperties: false,
              },
            },
          },
        });
        return JSON.parse((result.choices[0]?.message?.content as string) ?? "{}");
      })();

      // Research pricing
      const pricing = await researchPricing(ctx.env, 
        identification.name, identification.brand, identification.category, identification.condition
      );

      // Update item with all data
      await updateItem(ctx.env, itemId, ctx.user.id, {
        identifiedName: identification.name,
        identifiedBrand: identification.brand,
        identifiedCategory: identification.category,
        identifiedCondition: identification.condition,
        aiDescription: identification.description,
        aiTags: JSON.stringify(identification.tags),
        suggestedPrice: pricing.suggestedPrice.toString(),
        priceMin: pricing.priceMin.toString(),
        priceMax: pricing.priceMax.toString(),
        pricingData: JSON.stringify({ comparables: pricing.comparables, notes: pricing.pricingNotes }),
        status: "ready",
      });

      return { itemId, identification, pricing };
    }),

  // Create item from manual description
  createFromDescription: protectedProcedure
    .input(z.object({ description: z.string().min(3) }))
    .mutation(async ({ ctx, input }) => {
      const itemId = await createItem(ctx.env, {
        userId: ctx.user.id,
        manualDescription: input.description,
        status: "researching",
      });

      const result = await invokeLLM(ctx.env, {
        messages: [
          { role: "system", content: "You are an expert thrift store item identifier. Always respond with valid JSON only." },
          {
            role: "user",
            content: `Identify this thrift store item from the description: "${input.description}"
            Return JSON: { "name": string, "brand": string, "category": string, "condition": string, "description": string, "tags": string[], "estimatedEra": string, "uniqueFeatures": string, "confidence": number }`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "item_identification",
            strict: true,
            schema: {
              type: "object",
              properties: {
                name: { type: "string" }, brand: { type: "string" }, category: { type: "string" },
                condition: { type: "string" }, description: { type: "string" },
                tags: { type: "array", items: { type: "string" } },
                estimatedEra: { type: "string" }, uniqueFeatures: { type: "string" }, confidence: { type: "number" },
              },
              required: ["name", "brand", "category", "condition", "description", "tags", "estimatedEra", "uniqueFeatures", "confidence"],
              additionalProperties: false,
            },
          },
        },
      });
      const identification = JSON.parse((result.choices[0]?.message?.content as string) ?? "{}");

      const pricing = await researchPricing(ctx.env, 
        identification.name, identification.brand, identification.category, identification.condition
      );

      await updateItem(ctx.env, itemId, ctx.user.id, {
        identifiedName: identification.name,
        identifiedBrand: identification.brand,
        identifiedCategory: identification.category,
        identifiedCondition: identification.condition,
        aiDescription: identification.description,
        aiTags: JSON.stringify(identification.tags),
        suggestedPrice: pricing.suggestedPrice.toString(),
        priceMin: pricing.priceMin.toString(),
        priceMax: pricing.priceMax.toString(),
        pricingData: JSON.stringify({ comparables: pricing.comparables, notes: pricing.pricingNotes }),
        status: "ready",
      });

      return { itemId, identification, pricing };
    }),

  updateStatus: protectedProcedure
    .input(z.object({ id: z.number(), status: z.enum(["researching", "ready", "listed", "sold", "archived"]) }))
    .mutation(async ({ ctx, input }) => {
      await updateItem(ctx.env, input.id, ctx.user.id, { status: input.status });
      return { success: true };
    }),

  // Mark item as sold with final sale price and optional thrift cost
  markSold: protectedProcedure
    .input(z.object({
      id: z.number(),
      soldPrice: z.string(),
      thriftCost: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await updateItem(ctx.env, input.id, ctx.user.id, {
        status: "sold",
        soldPrice: input.soldPrice,
        soldAt: new Date(),
        ...(input.thriftCost ? { thriftCost: input.thriftCost } : {}),
      });
      return { success: true };
    }),

  // Update thrift cost paid for an item
  updateCost: protectedProcedure
    .input(z.object({ id: z.number(), thriftCost: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await updateItem(ctx.env, input.id, ctx.user.id, { thriftCost: input.thriftCost });
      return { success: true };
    }),

  // Profit stats for the dashboard
  profitStats: protectedProcedure.query(async ({ ctx }) => {
    return getProfitStats(ctx.env, ctx.user.id);
  }),

  // Quick Sell: create item + listing in one step from a description
  quickSell: protectedProcedure
    .input(z.object({
      description: z.string().min(1),
      imageUrl: z.string().optional(),
      thriftCost: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Create item record immediately
      const itemId = await createItem(ctx.env, {
        userId: ctx.user.id,
        manualDescription: input.description,
        imageUrl: input.imageUrl,
        thriftCost: input.thriftCost,
        status: "researching",
      });
      return { itemId };
    }),
});

// ── Listings Router ────────────────────────────────────────────────────────

const listingsRouter = router({
  list: protectedProcedure
    .input(z.object({ limit: z.number().default(20), offset: z.number().default(0) }))
    .query(async ({ ctx, input }) => {
      const rows = await listListings(ctx.env, ctx.user.id, input.limit, input.offset);
      return rows.map(r => ({
        ...r,
        tags: parseJsonField<string[]>(r.tags, []),
        price: String(r.price),
      }));
    }),

  getByItem: protectedProcedure
    .input(z.object({ itemId: z.number() }))
    .query(async ({ ctx, input }) => {
      const rows = await listListingsByItem(ctx.env, input.itemId, ctx.user.id);
      return rows.map(r => ({ ...r, tags: parseJsonField<string[]>(r.tags, []), price: String(r.price) }));
    }),

  create: protectedProcedure
    .input(z.object({
      itemId: z.number(),
      title: z.string().min(1),
      description: z.string().min(1),
      price: z.string(),
      category: z.string().optional(),
      tags: z.array(z.string()).optional(),
      condition: z.string().optional(),
      imageUrl: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = await createListing(ctx.env, {
        userId: ctx.user.id,
        itemId: input.itemId,
        title: input.title,
        description: input.description,
        price: input.price,
        category: input.category,
        tags: input.tags ? JSON.stringify(input.tags) : undefined,
        condition: input.condition,
        imageUrl: input.imageUrl,
      });
      // Mark item as listed
      await updateItem(ctx.env, input.itemId, ctx.user.id, { status: "listed" });
      return { id };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      description: z.string().optional(),
      price: z.string().optional(),
      category: z.string().optional(),
      tags: z.array(z.string()).optional(),
      condition: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, tags, ...rest } = input;
      await updateListing(ctx.env, id, ctx.user.id, {
        ...rest,
        tags: tags ? JSON.stringify(tags) : undefined,
      });
      return { success: true };
    }),

  // Post to a platform — eBay uses real API, others simulated for now
  postToPlatform: protectedProcedure
    .input(z.object({
      listingId: z.number(),
      platform: z.enum(["etsy", "ebay", "facebook"]),
      // eBay-specific optional overrides
      ebayCategoryId: z.string().optional(),
      ebayPostalCode: z.string().optional(),
      ebayLocation: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const listing = await getListingById(ctx.env, input.listingId, ctx.user.id);
      if (!listing) throw new Error("Listing not found");

      const updateData: Record<string, string> = {};

      if (input.platform === "ebay") {
        // Real eBay AddItem call
        const accessToken = await getValidAccessToken(ctx.env, ctx.user.id);
        const result = await addEbayListing(ctx.env, accessToken, {
          title: listing.title,
          description: listing.description,
          price: String(listing.price),
          categoryId: input.ebayCategoryId ?? "20081", // Antiques > Furniture default
          condition: listing.condition ?? "Good",
          imageUrls: listing.imageUrl ? [listing.imageUrl] : [],
          postalCode: input.ebayPostalCode ?? "99501",
          location: input.ebayLocation ?? "Alaska, US",
        });
        updateData.ebayStatus = "posted";
        updateData.ebayListingId = result.itemId;
        updateData.ebayUrl = result.url;
      } else if (input.platform === "etsy") {
        // Use the real Etsy API (requires Etsy account connected via /etsy/connect)
        const db = drizzle(ctx.env.DB);
        const tokenRows = await db.select().from(etsyTokens).where(eq(etsyTokens.userId, ctx.user.id)).limit(1);
        const tokenRow = tokenRows[0];
        if (!tokenRow) throw new Error("Etsy account not connected. Please connect your Etsy account first.");
        let accessToken = tokenRow.accessToken;
        if (Date.now() > tokenRow.accessTokenExpiresAt - 5 * 60 * 1000) {
          const refreshed = await refreshEtsyToken(ctx.env, tokenRow.refreshToken);
          accessToken = refreshed.accessToken;
          await db.update(etsyTokens).set({
            accessToken: refreshed.accessToken,
            refreshToken: refreshed.refreshToken,
            accessTokenExpiresAt: refreshed.expiresAt,
          }).where(eq(etsyTokens.userId, ctx.user.id));
        }
        if (!tokenRow.shopId) throw new Error("No Etsy shop found. Please reconnect your Etsy account.");
        const tags = parseJsonField<string[]>(listing.tags, []);
        const result = await createEtsyDraftListing(ctx.env, accessToken, tokenRow.shopId, {
          title: listing.title,
          description: listing.description,
          price: Number(listing.price),
          quantity: 1,
          tags,
        });
        updateData.etsyStatus = "posted";
        updateData.etsyListingId = String(result.listingId);
        updateData.etsyUrl = result.url;
      } else {
        // Facebook Marketplace API not yet integrated — simulate
        const fakeId = nanoid(10);
        updateData.fbStatus = "posted";
        updateData.fbListingId = fakeId;
        updateData.fbUrl = `https://www.facebook.com/marketplace/item/${fakeId}`;
      }

      await updateListing(ctx.env, input.listingId, ctx.user.id, updateData as any);
      const url = updateData.ebayUrl ?? updateData.etsyUrl ?? updateData.fbUrl ?? "";
      return { success: true, url };
    }),

  // Update shipment tracking info
  updateTracking: protectedProcedure
    .input(z.object({
      id: z.number(),
      trackingNumber: z.string().optional(),
      trackingCarrier: z.string().optional(),
      buyerName: z.string().optional(),
      buyerEmail: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      // Generate a share token if one doesn't exist yet
      const existing = await getListingById(ctx.env, id, ctx.user.id);
      const shareToken = existing?.trackingShareToken ?? nanoid(16);
      await updateListing(ctx.env, id, ctx.user.id, {
        ...data,
        trackingShareToken: shareToken,
      });
      return { success: true, shareToken };
    }),

  // Refresh tracking status from carrier API
  refreshTracking: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const listing = await getListingById(ctx.env, input.id, ctx.user.id);
      if (!listing?.trackingNumber) throw new Error("No tracking number set");

      // Use AI to simulate realistic tracking status based on carrier + number
      const result = await invokeLLM(ctx.env, {
        messages: msgs([
          { role: "system", content: "You are a shipping carrier tracking system. Return realistic tracking status JSON." },
          { role: "user", content: `Carrier: ${listing.trackingCarrier ?? "USPS"}\nTracking: ${listing.trackingNumber}\nReturn JSON: { "status": string, "lastUpdate": string, "estimatedDelivery": string, "events": [{"date": string, "location": string, "description": string}] }` },
        ]),
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "tracking_status",
            strict: true,
            schema: {
              type: "object",
              properties: {
                status: { type: "string" },
                lastUpdate: { type: "string" },
                estimatedDelivery: { type: "string" },
                events: { type: "array", items: { type: "object", properties: { date: { type: "string" }, location: { type: "string" }, description: { type: "string" } }, required: ["date", "location", "description"], additionalProperties: false } },
              },
              required: ["status", "lastUpdate", "estimatedDelivery", "events"],
              additionalProperties: false,
            },
          },
        },
      });
      const tracking = JSON.parse((result.choices[0]?.message?.content as string) ?? "{}");
      await updateListing(ctx.env, input.id, ctx.user.id, {
        trackingStatus: tracking.status,
        trackingLastUpdate: tracking.lastUpdate,
        trackingUpdatedAt: new Date(),
      });
      return tracking;
    }),

  // Public endpoint: get tracking info by share token (no auth required)
  getByShareToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const listing = await getListingByShareToken(ctx.env, input.token);
      if (!listing) throw new Error("Tracking link not found");
      // Return only safe public fields
      return {
        id: listing.id,
        title: listing.title,
        trackingNumber: listing.trackingNumber,
        trackingCarrier: listing.trackingCarrier,
        trackingStatus: listing.trackingStatus,
        trackingLastUpdate: listing.trackingLastUpdate,
        trackingUpdatedAt: listing.trackingUpdatedAt,
        buyerName: listing.buyerName,
        imageUrl: listing.imageUrl,
      };
    }),

  // Generate listing content with AI
  generateContent: protectedProcedure
    .input(z.object({
      itemId: z.number(),
      templateId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const item = await getItemById(ctx.env, input.itemId, ctx.user.id);
      if (!item) throw new Error("Item not found");

      let templateContext = "";
      if (input.templateId) {
        const template = await getTemplateById(ctx.env, input.templateId, ctx.user.id);
        if (template) {
          templateContext = `\nUse this template as a base:\nTemplate name: ${template.name}\nDescription template: ${template.descriptionTemplate}\nDefault tags: ${template.tags}`;
          await incrementTemplateUsage(ctx.env, input.templateId);
        }
      }

      const result = await invokeLLM(ctx.env, {
        messages: [
          {
            role: "system",
            content: "You are an expert resale listing copywriter who creates compelling, SEO-optimized listings for Etsy, eBay, and Facebook Marketplace. Always respond with valid JSON only.",
          },
          {
            role: "user",
            content: `Generate a complete listing for this thrift store item:
Name: ${item.identifiedName}
Brand: ${item.identifiedBrand ?? "Unknown"}
Category: ${item.identifiedCategory}
Condition: ${item.identifiedCondition}
AI Description: ${item.aiDescription}
Suggested Price: $${item.suggestedPrice}
${templateContext}

Return JSON:
{
  "title": string (max 80 chars, keyword-rich, compelling),
  "description": string (detailed, 150-250 words, includes condition, measurements if relevant, shipping info placeholder),
  "tags": string[] (13 tags for Etsy, mix of specific and broad),
  "etsyTitle": string (optimized for Etsy, max 140 chars),
  "ebayTitle": string (optimized for eBay, max 80 chars),
  "fbTitle": string (casual, conversational for Facebook),
  "suggestedCategory": string,
  "shippingNotes": string
}`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "listing_content",
            strict: true,
            schema: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                tags: { type: "array", items: { type: "string" } },
                etsyTitle: { type: "string" },
                ebayTitle: { type: "string" },
                fbTitle: { type: "string" },
                suggestedCategory: { type: "string" },
                shippingNotes: { type: "string" },
              },
              required: ["title", "description", "tags", "etsyTitle", "ebayTitle", "fbTitle", "suggestedCategory", "shippingNotes"],
              additionalProperties: false,
            },
          },
        },
      });
      return JSON.parse((result.choices[0]?.message?.content as string) ?? "{}");
    }),
});

// ── Templates Router ───────────────────────────────────────────────────────

const templatesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const rows = await listTemplates(ctx.env, ctx.user.id);
    return rows.map(r => ({
      ...r,
      tags: parseJsonField<string[]>(r.tags, []),
      defaultPlatforms: parseJsonField<string[]>(r.defaultPlatforms, []),
    }));
  }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      category: z.string().optional(),
      descriptionTemplate: z.string().optional(),
      tags: z.array(z.string()).optional(),
      defaultPlatforms: z.array(z.string()).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = await createTemplate(ctx.env, {
        userId: ctx.user.id,
        name: input.name,
        category: input.category,
        descriptionTemplate: input.descriptionTemplate,
        tags: input.tags ? JSON.stringify(input.tags) : undefined,
        defaultPlatforms: input.defaultPlatforms ? JSON.stringify(input.defaultPlatforms) : undefined,
        notes: input.notes,
      });
      return { id };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      category: z.string().optional(),
      descriptionTemplate: z.string().optional(),
      tags: z.array(z.string()).optional(),
      defaultPlatforms: z.array(z.string()).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, tags, defaultPlatforms, ...rest } = input;
      await updateTemplate(ctx.env, id, ctx.user.id, {
        ...rest,
        tags: tags ? JSON.stringify(tags) : undefined,
        defaultPlatforms: defaultPlatforms ? JSON.stringify(defaultPlatforms) : undefined,
      });
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deleteTemplate(ctx.env, input.id, ctx.user.id);
      return { success: true };
    }),
});

// ── Alerts Router ──────────────────────────────────────────────────────────

const alertsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const rows = await listAlerts(ctx.env, ctx.user.id);
    return rows.map(r => ({
      ...r,
      baselinePrice: r.baselinePrice ? String(r.baselinePrice) : null,
    }));
  }),

  create: protectedProcedure
    .input(z.object({
      keyword: z.string().min(1),
      category: z.string().optional(),
      baselinePrice: z.string().optional(),
      thresholdPercent: z.number().min(5).max(100).default(20),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = await createAlert(ctx.env, {
        userId: ctx.user.id,
        keyword: input.keyword,
        category: input.category,
        baselinePrice: input.baselinePrice,
        thresholdPercent: input.thresholdPercent,
      });
      return { id };
    }),

  toggle: protectedProcedure
    .input(z.object({ id: z.number(), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await updateAlert(ctx.env, input.id, ctx.user.id, { isActive: input.isActive });
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deleteAlert(ctx.env, input.id, ctx.user.id);
      return { success: true };
    }),

  // Check current market price for an alert keyword
  checkPrice: protectedProcedure
    .input(z.object({ keyword: z.string(), category: z.string().optional() }))
    .mutation(async ({ input }) => {
      const pricing = await researchPricing(ctx.env, input.keyword, "", input.category ?? "", "Good");
      return {
        currentPrice: pricing.suggestedPrice,
        priceMin: pricing.priceMin,
        priceMax: pricing.priceMax,
        comparables: pricing.comparables,
      };
    }),
});

// ── Etsy Router ───────────────────────────────────────────────────────────

const etsyRouter = router({
  status: protectedProcedure.query(async ({ ctx }) => {
    const db = drizzle(ctx.env.DB);
    const rows = await db.select().from(etsyTokens).where(eq(etsyTokens.userId, ctx.user.id)).limit(1);
    const token = rows[0];
    if (!token) return { connected: false, shopName: null };
    return { connected: true, shopName: token.shopName ?? null };
  }),

  getAuthUrl: protectedProcedure
    .input(z.object({ redirectUri: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!hasEtsyCredentials(ctx.env)) throw new Error("Etsy API credentials not configured");
      const state = btoa(JSON.stringify({ userId: ctx.user.id, ts: Date.now() }));
      // Generate PKCE code verifier and challenge
      const verifier = nanoid(64);
      const encoder = new TextEncoder();
      const data = encoder.encode(verifier);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const challenge = btoa(String.fromCharCode(...hashArray))
        .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
      // Store verifier in a simple way (in production, use session/DB)
      const url = getEtsyAuthUrl(ctx.env, input.redirectUri, state, challenge);
      return { url, verifier, state };
    }),

  connect: protectedProcedure
    .input(z.object({ code: z.string(), redirectUri: z.string(), codeVerifier: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const tokens = await exchangeEtsyCode(ctx.env, input.code, input.redirectUri, input.codeVerifier);
      // Get shop info
      let shopId: number | undefined;
      let shopName: string | undefined;
      try {
        const shop = await getMyShop(ctx.env, tokens.accessToken);
        shopId = shop.shop_id;
        shopName = shop.shop_name;
      } catch { /* shop fetch optional */ }
      const db = drizzle(ctx.env.DB);
      const existingEtsy = await db.select({ id: etsyTokens.id }).from(etsyTokens).where(eq(etsyTokens.userId, ctx.user.id)).limit(1);
      if (existingEtsy.length > 0) {
        await db.update(etsyTokens).set({
          accessToken: tokens.accessToken, refreshToken: tokens.refreshToken,
          accessTokenExpiresAt: Math.floor(tokens.expiresAt / 1000), shopId, shopName,
        }).where(eq(etsyTokens.userId, ctx.user.id));
      } else {
        await db.insert(etsyTokens).values({
          userId: ctx.user.id, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken,
          accessTokenExpiresAt: Math.floor(tokens.expiresAt / 1000), shopId, shopName,
        });
      }
      return { success: true, shopName };
    }),

  postListing: protectedProcedure
    .input(z.object({ listingId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = drizzle(ctx.env.DB);
      const rows = await db.select().from(etsyTokens).where(eq(etsyTokens.userId, ctx.user.id)).limit(1);
      const tokenRow = rows[0];
      if (!tokenRow) throw new Error("Etsy account not connected. Please connect your Etsy account first.");
      // Refresh token if expired
      let accessToken = tokenRow.accessToken;
      if (Date.now() / 1000 > tokenRow.accessTokenExpiresAt - 60) {
        const refreshed = await refreshEtsyToken(ctx.env, tokenRow.refreshToken);
        accessToken = refreshed.accessToken;
        await db.update(etsyTokens).set({
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken,
          accessTokenExpiresAt: Math.floor(refreshed.expiresAt / 1000),
        }).where(eq(etsyTokens.userId, ctx.user.id));
      }
      const listing = await getListingById(ctx.env, input.listingId, ctx.user.id);
      if (!listing) throw new Error("Listing not found");
      if (!tokenRow.shopId) throw new Error("No Etsy shop found. Please reconnect your Etsy account.");
      const tags = listing.tags ? JSON.parse(listing.tags) as string[] : [];
      const result = await createEtsyDraftListing(ctx.env, accessToken, tokenRow.shopId, {
        title: listing.title,
        description: listing.description,
        price: Number(listing.price),
        quantity: 1,
        tags,
      });
      await updateListing(ctx.env, input.listingId, ctx.user.id, {
        etsyStatus: "posted",
        etsyListingId: String(result.listingId),
        etsyUrl: result.url,
      });
      return { success: true, url: result.url, listingId: result.listingId };
    }),
});

// ── eBay Router ───────────────────────────────────────────────────────────

const ebayRouter = router({
  status: protectedProcedure.query(async ({ ctx }) => {
    return getEbayStatus(ctx.user.id);
  }),

  getAuthUrl: protectedProcedure.query(async ({ ctx }) => {
    const state = btoa(JSON.stringify({ userId: ctx.user.id, ts: Date.now() }));
    return { url: getEbayAuthUrl(ctx.env, state) };
  }),

  connectAccount: protectedProcedure
    .input(z.object({ code: z.string(), state: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const tokens = await exchangeCodeForToken(ctx.env, input.code);
      await upsertEbayToken(ctx.env,
        ctx.user.id,
        tokens.accessToken,
        tokens.refreshToken,
        tokens.accessTokenExpiresAt,
        tokens.refreshTokenExpiresAt,
      );
      return { success: true };
    }),

  /** Pull active + sold listings from eBay and return them for display/import */
  syncListings: protectedProcedure.mutation(async ({ ctx }) => {
    const accessToken = await getValidAccessToken(ctx.env, ctx.user.id);
    const [active, sold] = await Promise.all([
      getActiveListings(accessToken).catch(() => [] as Awaited<ReturnType<typeof getActiveListings>>),
      getSoldListings(accessToken).catch(() => [] as Awaited<ReturnType<typeof getSoldListings>>),
    ]);
    return {
      active,
      sold,
      total: active.length + sold.length,
      syncedAt: new Date().toISOString(),
    };
  }),

  /** Import a single eBay listing into ThriftLister as an item + listing record */
  importListing: protectedProcedure
    .input(z.object({
      ebayItemId: z.string(),
      title: z.string(),
      price: z.string(),
      status: z.enum(["active", "sold", "ended"]),
      viewItemUrl: z.string(),
      imageUrl: z.string().optional(),
      category: z.string().optional(),
      condition: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = drizzle(ctx.env.DB);

      // Check if already imported (by ebayListingId)
      const existing = await db
        .select({ id: listings.id })
        .from(listings)
        .where(eq(listings.ebayListingId, input.ebayItemId))
        .limit(1);
      if (existing.length > 0) {
        return { success: true, alreadyExists: true, listingId: existing[0].id };
      }

      // Create item record
      const [itemRow] = await db.insert(items).values({
        userId: ctx.user.id,
        imageUrl: input.imageUrl ?? null,
        identifiedName: input.title,
        identifiedCategory: input.category ?? null,
        identifiedCondition: input.condition ?? null,
        suggestedPrice: input.price as any,
        status: input.status === "sold" ? "sold" : "listed",
      }).returning({ id: items.id });

      // Create listing record
      const [listingRow] = await db.insert(listings).values({
        userId: ctx.user.id,
        itemId: itemRow.id,
        title: input.title,
        description: `Imported from eBay listing ${input.ebayItemId}`,
        price: input.price as any,
        category: input.category ?? null,
        imageUrl: input.imageUrl ?? null,
        ebayStatus: "posted",
        ebayListingId: input.ebayItemId,
        ebayUrl: input.viewItemUrl,
      }).returning({ id: listings.id });

      return { success: true, alreadyExists: false, listingId: listingRow.id };
    }),
});

// ── App Router ─────────────────────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.responseHeaders.set("Set-Cookie", buildClearCookieHeader(COOKIE_NAME));
      return { success: true } as const;
    }),
  }),
  items: itemsRouter,
  listings: listingsRouter,
  templates: templatesRouter,
  alerts: alertsRouter,
  ebay: ebayRouter,
  etsy: etsyRouter,
});

export type AppRouter = typeof appRouter;
