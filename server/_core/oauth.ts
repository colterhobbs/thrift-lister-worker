import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import * as db from "../db";
import { buildSetCookieHeader } from "./cookies";
import { sdk } from "./sdk";
import type { WorkerEnv } from "./env";

export async function handleOAuthCallback(request: Request, env: WorkerEnv): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    return new Response(JSON.stringify({ error: "code and state are required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const redirectUri = atob(state);

    const tokenResponse = await sdk.exchangeGoogleCode(env, code, redirectUri);
    const userInfo = await sdk.getGoogleUserInfo(tokenResponse.access_token);

    if (!userInfo.sub) {
      return new Response(JSON.stringify({ error: "Google user ID (sub) missing" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const openId = `google:${userInfo.sub}`;

    await db.upsertUser(env, {
      openId,
      name: userInfo.name || null,
      email: userInfo.email ?? null,
      loginMethod: "google",
      lastSignedIn: new Date().toISOString(),
    });

    const sessionToken = await sdk.createSessionToken(env, openId, {
      name: userInfo.name || userInfo.email || "",
      expiresInMs: ONE_YEAR_MS,
    });

    const cookieHeader = buildSetCookieHeader(COOKIE_NAME, sessionToken, {
      maxAge: Math.floor(ONE_YEAR_MS / 1000),
      httpOnly: true,
      secure: true,
      sameSite: "None",
      path: "/",
    });

    return new Response(null, {
      status: 302,
      headers: {
        Location: "/",
        "Set-Cookie": cookieHeader,
      },
    });
  } catch (error) {
    console.error("[OAuth] Google callback failed", error);
    return new Response(JSON.stringify({ error: "OAuth callback failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
