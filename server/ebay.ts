/**
 * eBay Trading API Service for ThriftLister
 * Handles OAuth token exchange/refresh and AddItem calls
 */

import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { ebayTokens } from "../drizzle/schema";
import type { WorkerEnv } from "./_core/env";

const EBAY_OAUTH_URL = "https://api.ebay.com/identity/v1/oauth2/token";
const EBAY_TRADING_URL = "https://api.ebay.com/ws/api.dll";

const SCOPES = [
  "https://api.ebay.com/oauth/api_scope",
  "https://api.ebay.com/oauth/api_scope/sell.inventory",
  "https://api.ebay.com/oauth/api_scope/sell.inventory.readonly",
  "https://api.ebay.com/oauth/api_scope/sell.account",
  "https://api.ebay.com/oauth/api_scope/sell.account.readonly",
  "https://api.ebay.com/oauth/api_scope/sell.fulfillment",
  "https://api.ebay.com/oauth/api_scope/sell.fulfillment.readonly",
].join(" ");

function base64(str: string): string {
  return btoa(str);
}

// ── OAuth ──────────────────────────────────────────────────────────────────

export function getEbayAuthUrl(env: WorkerEnv, state: string): string {
  const params = new URLSearchParams({
    client_id: env.EBAY_CLIENT_ID,
    redirect_uri: env.EBAY_REDIRECT_URI,
    response_type: "code",
    scope: SCOPES,
    state,
  });
  return `https://auth.ebay.com/oauth2/authorize?${params.toString()}`;
}

export async function exchangeCodeForToken(env: WorkerEnv, code: string) {
  const creds = base64(`${env.EBAY_CLIENT_ID}:${env.EBAY_CLIENT_SECRET}`);
  const res = await fetch(EBAY_OAUTH_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${creds}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: env.EBAY_REDIRECT_URI,
    }).toString(),
  });

  const data = await res.json() as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    refresh_token_expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (!data.access_token) {
    throw new Error(`eBay token exchange failed: ${data.error_description ?? data.error}`);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token!,
    accessTokenExpiresAt: Date.now() + (data.expires_in! * 1000),
    refreshTokenExpiresAt: Date.now() + (data.refresh_token_expires_in! * 1000),
  };
}

async function refreshAccessToken(env: WorkerEnv, refreshToken: string) {
  const creds = base64(`${env.EBAY_CLIENT_ID}:${env.EBAY_CLIENT_SECRET}`);
  const res = await fetch(EBAY_OAUTH_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${creds}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      scope: SCOPES,
    }).toString(),
  });

  const data = await res.json() as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (!data.access_token) {
    throw new Error(`eBay token refresh failed: ${data.error_description ?? data.error}`);
  }

  return {
    accessToken: data.access_token,
    accessTokenExpiresAt: Date.now() + (data.expires_in! * 1000),
  };
}

// ── Token DB helpers ───────────────────────────────────────────────────────

export async function upsertEbayToken(
  env: WorkerEnv,
  userId: number,
  accessToken: string,
  refreshToken: string,
  accessTokenExpiresAt: number,
  refreshTokenExpiresAt: number
) {
  const db = drizzle(env.DB);
  const existing = await db.select().from(ebayTokens).where(eq(ebayTokens.userId, userId)).limit(1);

  if (existing.length > 0) {
    await db.update(ebayTokens)
      .set({ accessToken, refreshToken, accessTokenExpiresAt, refreshTokenExpiresAt })
      .where(eq(ebayTokens.userId, userId));
  } else {
    await db.insert(ebayTokens).values({ userId, accessToken, refreshToken, accessTokenExpiresAt, refreshTokenExpiresAt });
  }
}

export async function getEbayToken(env: WorkerEnv, userId: number) {
  const db = drizzle(env.DB);
  const rows = await db.select().from(ebayTokens).where(eq(ebayTokens.userId, userId)).limit(1);
  return rows[0] ?? null;
}

export async function getValidAccessToken(env: WorkerEnv, userId: number): Promise<string> {
  const token = await getEbayToken(env, userId);
  if (!token) throw new Error("No eBay token found. Please connect your eBay account first.");

  if (Date.now() > token.accessTokenExpiresAt - 5 * 60 * 1000) {
    const refreshed = await refreshAccessToken(env, token.refreshToken);
    await upsertEbayToken(env, userId, refreshed.accessToken, token.refreshToken, refreshed.accessTokenExpiresAt, token.refreshTokenExpiresAt);
    return refreshed.accessToken;
  }

  return token.accessToken;
}

export async function getEbayStatus(env: WorkerEnv, userId: number) {
  const token = await getEbayToken(env, userId);
  if (!token) return { connected: false };
  const isExpired = Date.now() > token.refreshTokenExpiresAt;
  return { connected: !isExpired };
}

// ── Trading API ────────────────────────────────────────────────────────────

async function tradingApiCall(env: WorkerEnv, callName: string, xmlBody: string, accessToken: string): Promise<string> {
  const res = await fetch(EBAY_TRADING_URL, {
    method: "POST",
    headers: {
      "X-EBAY-API-SITEID": "0",
      "X-EBAY-API-COMPATIBILITY-LEVEL": "967",
      "X-EBAY-API-CALL-NAME": callName,
      "X-EBAY-API-APP-NAME": env.EBAY_CLIENT_ID,
      "X-EBAY-API-DEV-NAME": env.EBAY_DEV_ID,
      "X-EBAY-API-CERT-NAME": env.EBAY_CLIENT_SECRET,
      "X-EBAY-API-IAF-TOKEN": accessToken,
      "Content-Type": "text/xml",
    },
    body: `<?xml version="1.0" encoding="utf-8"?>
<${callName}Request xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>${accessToken}</eBayAuthToken>
  </RequesterCredentials>
  ${xmlBody}
</${callName}Request>`,
  });
  return res.text();
}

function parseXml(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return match?.[1]?.trim() ?? "";
}

const CONDITION_MAP: Record<string, string> = {
  "Excellent": "3000",
  "Very Good": "4000",
  "Good": "3000",
  "Fair": "5000",
  "Poor": "6000",
  "For parts": "7000",
  "New": "1000",
  "Like New": "2500",
};

export async function addEbayListing(
  env: WorkerEnv,
  accessToken: string,
  item: {
    title: string;
    description: string;
    price: string;
    quantity?: number;
    categoryId: string;
    condition?: string;
    imageUrls?: string[];
    postalCode?: string;
    location?: string;
  }
): Promise<{ itemId: string; url: string }> {
  const conditionId = CONDITION_MAP[item.condition ?? "Good"] ?? "3000";
  const pictureXml = (item.imageUrls ?? []).length > 0
    ? `<PictureDetails>${(item.imageUrls ?? []).map(u => `<PictureURL>${u}</PictureURL>`).join("")}</PictureDetails>`
    : "";

  const xml = await tradingApiCall(env, "AddItem", `
    <Item>
      <Title>${item.title.substring(0, 80)}</Title>
      <Description><![CDATA[${item.description}]]></Description>
      <PrimaryCategory><CategoryID>${item.categoryId}</CategoryID></PrimaryCategory>
      <StartPrice>${item.price}</StartPrice>
      <ConditionID>${conditionId}</ConditionID>
      <Country>US</Country>
      <Currency>USD</Currency>
      <DispatchTimeMax>3</DispatchTimeMax>
      <ListingDuration>GTC</ListingDuration>
      <ListingType>FixedPriceItem</ListingType>
      <Quantity>${item.quantity ?? 1}</Quantity>
      <Location>${item.location ?? "Alaska, US"}</Location>
      <PostalCode>${item.postalCode ?? "99501"}</PostalCode>
      ${pictureXml}
      <ShippingDetails>
        <ShippingType>Flat</ShippingType>
        <ShippingServiceOptions>
          <ShippingServicePriority>1</ShippingServicePriority>
          <ShippingService>USPSPriority</ShippingService>
          <ShippingServiceCost>15.00</ShippingServiceCost>
        </ShippingServiceOptions>
      </ShippingDetails>
      <ReturnPolicy>
        <ReturnsAcceptedOption>ReturnsNotAccepted</ReturnsAcceptedOption>
      </ReturnPolicy>
    </Item>
  `, accessToken);

  const ack = parseXml(xml, "Ack");
  if (ack !== "Success" && ack !== "Warning") {
    const errMsg = parseXml(xml, "LongMessage") || parseXml(xml, "ShortMessage");
    throw new Error(`eBay AddItem failed: ${errMsg}`);
  }

  const itemId = parseXml(xml, "ItemID");
  return {
    itemId,
    url: `https://www.ebay.com/itm/${itemId}`,
  };
}

// ── Sync ───────────────────────────────────────────────────────────────────

export interface EbaySyncedListing {
  itemId: string;
  title: string;
  price: string;
  currency: string;
  status: "active" | "sold" | "ended";
  viewItemUrl: string;
  imageUrl?: string;
  startTime?: string;
  endTime?: string;
  quantitySold?: number;
  currentPrice?: string;
  category?: string;
  condition?: string;
}

function parseItemBlock(block: string): Partial<EbaySyncedListing> {
  const get = (tag: string) => parseXml(block, tag);
  return {
    itemId: get("ItemID"),
    title: get("Title"),
    price: get("CurrentPrice") || get("BuyItNowPrice") || get("StartPrice"),
    currency: "USD",
    viewItemUrl: get("ViewItemURL"),
    imageUrl: get("GalleryURL") || get("PictureURL") || undefined,
    startTime: get("StartTime") || undefined,
    endTime: get("EndTime") || undefined,
    condition: get("ConditionDisplayName") || undefined,
  };
}

export async function getActiveListings(env: WorkerEnv, accessToken: string): Promise<EbaySyncedListing[]> {
  const xml = await tradingApiCall(env, "GetMyeBaySelling", `
    <ActiveList>
      <Include>true</Include>
      <Pagination>
        <EntriesPerPage>200</EntriesPerPage>
        <PageNumber>1</PageNumber>
      </Pagination>
    </ActiveList>
  `, accessToken);

  const ack = parseXml(xml, "Ack");
  if (ack !== "Success" && ack !== "Warning") {
    const errMsg = parseXml(xml, "LongMessage") || parseXml(xml, "ShortMessage");
    throw new Error(`GetMyeBaySelling failed: ${errMsg}`);
  }

  const itemArrayMatch = xml.match(/<ActiveList[\s\S]*?<ItemArray>([\s\S]*?)<\/ItemArray>/);
  if (!itemArrayMatch) return [];

  const itemBlocks = itemArrayMatch[1].match(/<Item>([\s\S]*?)<\/Item>/g) ?? [];
  return itemBlocks.map(block => ({ ...parseItemBlock(block), status: "active" as const } as EbaySyncedListing)).filter(i => i.itemId);
}

export async function getSoldListings(env: WorkerEnv, accessToken: string): Promise<EbaySyncedListing[]> {
  const endTimeFrom = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const endTimeTo = new Date().toISOString();

  const xml = await tradingApiCall(env, "GetSellerList", `
    <EndTimeFrom>${endTimeFrom}</EndTimeFrom>
    <EndTimeTo>${endTimeTo}</EndTimeTo>
    <Pagination>
      <EntriesPerPage>200</EntriesPerPage>
      <PageNumber>1</PageNumber>
    </Pagination>
    <GranularityLevel>Fine</GranularityLevel>
    <IncludeWatchCount>false</IncludeWatchCount>
  `, accessToken);

  const ack = parseXml(xml, "Ack");
  if (ack !== "Success" && ack !== "Warning") {
    const errMsg = parseXml(xml, "LongMessage") || parseXml(xml, "ShortMessage");
    throw new Error(`GetSellerList failed: ${errMsg}`);
  }

  const itemBlocks = xml.match(/<Item>([\s\S]*?)<\/Item>/g) ?? [];
  return itemBlocks.map(block => {
    const parsed = parseItemBlock(block);
    const sellingStatus = parseXml(block, "SellingStatus");
    const listingStatus = sellingStatus ? parseXml(sellingStatus, "ListingStatus") : "";
    const quantitySoldStr = sellingStatus ? parseXml(sellingStatus, "QuantitySold") : "0";
    return {
      ...parsed,
      status: listingStatus === "Completed" ? "sold" as const : "ended" as const,
      quantitySold: parseInt(quantitySoldStr, 10) || 0,
    } as EbaySyncedListing;
  }).filter(i => i.itemId);
}
