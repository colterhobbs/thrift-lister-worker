/**
 * eBay credentials validation test
 * Verifies that the EBAY_CLIENT_ID and EBAY_CLIENT_SECRET are valid by
 * attempting a client_credentials grant with the eBay OAuth endpoint.
 * This is a lightweight check that doesn't require a user token.
 */
import { describe, it, expect } from "vitest";

describe("eBay API credentials", () => {
  it("EBAY_CLIENT_ID and EBAY_CLIENT_SECRET are set", () => {
    expect(process.env.EBAY_CLIENT_ID).toBeTruthy();
    expect(process.env.EBAY_CLIENT_SECRET).toBeTruthy();
    expect(process.env.EBAY_CLIENT_ID).toMatch(/^ShawnaHo-listinga-PRD-/);
    expect(process.env.EBAY_CLIENT_SECRET).toMatch(/^PRD-/);
  });

  it("EBAY_DEV_ID is set", () => {
    expect(process.env.EBAY_DEV_ID).toBeTruthy();
  });

  it("EBAY_REDIRECT_URI (RuName) is set", () => {
    expect(process.env.EBAY_REDIRECT_URI).toBeTruthy();
  });

  it("eBay client credentials grant returns a valid application token", async () => {
    const clientId = process.env.EBAY_CLIENT_ID!;
    const clientSecret = process.env.EBAY_CLIENT_SECRET!;

    if (!clientId || !clientSecret) {
      console.warn("Skipping live eBay API test — credentials not set");
      return;
    }

    const creds = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const res = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${creds}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        scope: "https://api.ebay.com/oauth/api_scope",
      }).toString(),
    });

    const data = await res.json() as { access_token?: string; error?: string; error_description?: string };

    if (data.error) {
      console.error("eBay OAuth error:", data.error, data.error_description);
    }

    expect(res.status).toBe(200);
    expect(data.access_token).toBeTruthy();
    expect(typeof data.access_token).toBe("string");
  }, 15000); // 15s timeout for network call
});
