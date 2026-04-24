import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import type { WorkerEnv } from "./env";

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

export type SessionPayload = {
  openId: string;
  name: string;
};

interface GoogleTokenResponse {
  access_token: string;
  id_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
  refresh_token?: string;
}

interface GoogleUserInfo {
  sub: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  email?: string;
  email_verified?: boolean;
}

class SDKServer {
  async exchangeGoogleCode(env: WorkerEnv, code: string, redirectUri: string): Promise<GoogleTokenResponse> {
    const params = new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google token exchange failed: ${error}`);
    }

    return response.json() as Promise<GoogleTokenResponse>;
  }

  async getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google userinfo failed: ${error}`);
    }

    return response.json() as Promise<GoogleUserInfo>;
  }

  private getSessionSecret(env: WorkerEnv) {
    return new TextEncoder().encode(env.JWT_SECRET);
  }

  async createSessionToken(
    env: WorkerEnv,
    openId: string,
    options: { expiresInMs?: number; name?: string } = {}
  ): Promise<string> {
    return this.signSession(env, { openId, name: options.name || "" }, options);
  }

  async signSession(
    env: WorkerEnv,
    payload: SessionPayload,
    options: { expiresInMs?: number } = {}
  ): Promise<string> {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);
    const secretKey = this.getSessionSecret(env);

    return new SignJWT({ openId: payload.openId, name: payload.name })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(expirationSeconds)
      .sign(secretKey);
  }

  async verifySession(
    env: WorkerEnv,
    cookieValue: string | undefined | null
  ): Promise<{ openId: string; name: string } | null> {
    if (!cookieValue) return null;

    try {
      const secretKey = this.getSessionSecret(env);
      const { payload } = await jwtVerify(cookieValue, secretKey, { algorithms: ["HS256"] });
      const { openId, name } = payload as Record<string, unknown>;

      if (!isNonEmptyString(openId)) return null;

      return { openId, name: isNonEmptyString(name) ? name : "" };
    } catch {
      return null;
    }
  }

  async authenticateRequest(env: WorkerEnv, request: Request): Promise<User> {
    const cookieHeader = request.headers.get("cookie") ?? "";
    const sessionCookie = parseCookieValue(cookieHeader, COOKIE_NAME);
    const session = await this.verifySession(env, sessionCookie);

    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }

    const user = await db.getUserByOpenId(env, session.openId);

    if (!user) {
      throw ForbiddenError("User not found");
    }

    await db.upsertUser(env, { openId: user.openId, lastSignedIn: new Date().toISOString() });

    return user;
  }
}

function parseCookieValue(cookieHeader: string, name: string): string | undefined {
  const cookies = cookieHeader.split(";").map(c => c.trim());
  for (const cookie of cookies) {
    const [k, ...rest] = cookie.split("=");
    if (k.trim() === name) return rest.join("=").trim();
  }
  return undefined;
}

export const sdk = new SDKServer();
