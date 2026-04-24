/**
 * Etsy Open API v3 Service for ThriftLister
 * Handles OAuth PKCE flow and CreateDraftListing calls
 */

import type { WorkerEnv } from "./_core/env";

const ETSY_TOKEN_URL = "https://api.etsy.com/v3/public/oauth/token";
const ETSY_API_BASE = "https://openapi.etsy.com/v3";

const SCOPES = ["listings_w", "listings_r", "listings_d", "shops_r"].join(" ");

// ── OAuth PKCE ─────────────────────────────────────────────────────────────

export function getEtsyAuthUrl(env: WorkerEnv, redirectUri: string, state: string, codeChallenge: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    redirect_uri: redirectUri,
    scope: SCOPES,
    client_id: env.ETSY_API_KEY,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
  return `https://www.etsy.com/oauth/connect?${params.toString()}`;
}

export async function exchangeEtsyCode(env: WorkerEnv, code: string, redirectUri: string, codeVerifier: string) {
  const res = await fetch(ETSY_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: env.ETSY_API_KEY,
      redirect_uri: redirectUri,
      code,
      code_verifier: codeVerifier,
    }).toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Etsy token exchange failed: ${err}`);
  }

  const data = await res.json() as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

export async function refreshEtsyToken(env: WorkerEnv, refreshToken: string) {
  const res = await fetch(ETSY_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: env.ETSY_API_KEY,
      refresh_token: refreshToken,
    }).toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Etsy token refresh failed: ${err}`);
  }

  const data = await res.json() as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

// ── API Helpers ────────────────────────────────────────────────────────────

async function etsyRequest(
  env: WorkerEnv,
  path: string,
  method: string,
  accessToken: string,
  body?: Record<string, unknown>
) {
  const res = await fetch(`${ETSY_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "x-api-key": env.ETSY_API_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Etsy API error ${res.status}: ${err}`);
  }

  return res.json();
}

// ── Shop ───────────────────────────────────────────────────────────────────

export async function getMyShop(env: WorkerEnv, accessToken: string): Promise<{ shop_id: number; shop_name: string }> {
  const data = await etsyRequest(env, "/application/shops", "GET", accessToken) as {
    results: Array<{ shop_id: number; shop_name: string }>;
  };
  const shop = data.results?.[0];
  if (!shop) throw new Error("No Etsy shop found for this account");
  return shop;
}

// ── Listings ───────────────────────────────────────────────────────────────

export interface EtsyListingInput {
  title: string;
  description: string;
  price: number;
  quantity: number;
  tags: string[];
  whoMade?: "i_did" | "someone_else" | "collective";
  whenMade?: string;
  isSupply?: boolean;
}

export async function createEtsyDraftListing(
  env: WorkerEnv,
  accessToken: string,
  shopId: number,
  listing: EtsyListingInput
) {
  const body = {
    title: listing.title.slice(0, 140),
    description: listing.description,
    price: listing.price,
    quantity: listing.quantity ?? 1,
    tags: listing.tags.slice(0, 13).map(t => t.slice(0, 20)),
    who_made: listing.whoMade ?? "someone_else",
    when_made: listing.whenMade ?? "2020_2024",
    is_supply: listing.isSupply ?? false,
    taxonomy_id: 69,
    type: "physical",
    state: "draft",
  };

  const result = await etsyRequest(env, `/application/shops/${shopId}/listings`, "POST", accessToken, body) as {
    listing_id: number;
    url: string;
  };

  return {
    listingId: result.listing_id,
    url: `https://www.etsy.com/listing/${result.listing_id}`,
  };
}

export function hasEtsyCredentials(env: WorkerEnv): boolean {
  return Boolean(env.ETSY_API_KEY && env.ETSY_SHARED_SECRET);
}
