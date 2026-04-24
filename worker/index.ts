/**
 * ThriftLister Cloudflare Worker Entry Point
 *
 * Routes:
 *   GET/POST /api/oauth/callback  → Google OAuth flow
 *   GET      /api/ebay/callback   → eBay OAuth flow
 *   *        /api/trpc/*          → tRPC handler
 *   *        /*                   → 404 (frontend served by CF Pages)
 */

import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { handleOAuthCallback } from "../server/_core/oauth";
import { createContext } from "../server/_core/context";
import { appRouter } from "../server/routers";
import type { WorkerEnv } from "../server/_core/env";
import { exchangeCodeForToken, upsertEbayToken } from "../server/ebay";

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers for cross-origin requests from the Pages frontend
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
    };

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Google OAuth callback
    if (path === "/api/oauth/callback") {
      const response = await handleOAuthCallback(request, env);
      // Add CORS headers to the response
      const newHeaders = new Headers(response.headers);
      for (const [k, v] of Object.entries(corsHeaders)) {
        newHeaders.set(k, v);
      }
      return new Response(response.body, {
        status: response.status,
        headers: newHeaders,
      });
    }

    // eBay OAuth callback
    if (path === "/api/ebay/callback") {
      return handleEbayCallback(request, env);
    }

    // tRPC routes
    if (path.startsWith("/api/trpc/")) {
      const responseHeaders = new Headers(corsHeaders);

      const response = await fetchRequestHandler({
        endpoint: "/api/trpc",
        req: request,
        router: appRouter,
        createContext: (opts) => createContext(opts, env, responseHeaders),
        onError: ({ path, error }) => {
          console.error(`[tRPC] Error on ${path}:`, error);
        },
      });

      // Merge any Set-Cookie headers (e.g., from logout)
      const finalHeaders = new Headers(response.headers);
      for (const [k, v] of responseHeaders.entries()) {
        if (k.toLowerCase() !== "set-cookie") {
          finalHeaders.set(k, v);
        }
      }
      // Append Set-Cookie if any
      const setCookie = responseHeaders.get("Set-Cookie");
      if (setCookie) {
        finalHeaders.append("Set-Cookie", setCookie);
      }

      return new Response(response.body, {
        status: response.status,
        headers: finalHeaders,
      });
    }

    // All other routes → 404
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  },
};

async function handleEbayCallback(request: Request, env: WorkerEnv): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code) {
    return new Response("Missing code", { status: 400 });
  }

  try {
    // Parse userId from state
    let userId: number | null = null;
    if (state) {
      try {
        const decoded = JSON.parse(atob(state)) as { userId: number };
        userId = decoded.userId;
      } catch { /* ignore */ }
    }

    if (!userId) {
      return new Response("Invalid state: missing userId", { status: 400 });
    }

    const tokens = await exchangeCodeForToken(env, code);
    await upsertEbayToken(env, userId, tokens.accessToken, tokens.refreshToken, tokens.accessTokenExpiresAt, tokens.refreshTokenExpiresAt);

    return new Response(null, {
      status: 302,
      headers: { Location: "/settings?ebay=connected" },
    });
  } catch (err) {
    console.error("[eBay callback] Error:", err);
    return new Response("eBay OAuth failed", { status: 500 });
  }
}
