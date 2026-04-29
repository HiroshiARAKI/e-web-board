// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { authSessions } from "@/db/schema";
import {
  AUTH_SESSION_COOKIE,
  SESSION_MAX_AGE,
  buildAuthCookieOptions,
} from "@/lib/auth";
import {
  DEVICE_AUTH_COOKIE,
  clearLegacyLastUserCookie,
  setDeviceAuthCookie,
  storeDeviceFullAuth,
} from "@/lib/device-auth";
import { generateSessionToken } from "@/lib/pin";
import { buildPublicAppUrl } from "@/lib/public-origin";

export const GOOGLE_OAUTH_STATE_COOKIE = "google-oauth-state";
export const GOOGLE_OAUTH_STATE_MAX_AGE = 60 * 10;
export const GOOGLE_AUTH_PROVIDER = "google";
export const CREDENTIALS_AUTH_PROVIDER = "credentials";

export type GoogleAuthMode = "login" | "owner-signup" | "shared-signup";

export interface GoogleStatePayload {
  nonce: string;
  mode: GoogleAuthMode;
  redirectTo?: string;
  userId?: string;
  phoneNumber?: string;
  sharedSignupToken?: string;
}

export interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

function base64UrlDecode(input: string): string | null {
  try {
    return Buffer.from(input, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

export function isGoogleAuthEnabled(): boolean {
  return (
    process.env.GOOGLE_OAUTH_ENABLED === "true" &&
    !!process.env.GOOGLE_OAUTH_CLIENT_ID &&
    !!process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
    !!buildGoogleRedirectUri()
  );
}

export function buildGoogleRedirectUri(): string | null {
  return buildPublicAppUrl("/api/auth/google/callback");
}

export function createGoogleState(
  input: Omit<GoogleStatePayload, "nonce">,
): GoogleStatePayload {
  return {
    ...input,
    nonce: randomBytes(16).toString("hex"),
  };
}

export function encodeGoogleState(payload: GoogleStatePayload): string {
  return base64UrlEncode(JSON.stringify(payload));
}

export function decodeGoogleState(value: string): GoogleStatePayload | null {
  const decoded = base64UrlDecode(value);
  if (!decoded) return null;

  try {
    const parsed = JSON.parse(decoded) as Partial<GoogleStatePayload>;
    if (!parsed.nonce || !parsed.mode) return null;
    if (!["login", "owner-signup", "shared-signup"].includes(parsed.mode)) {
      return null;
    }
    return parsed as GoogleStatePayload;
  } catch {
    return null;
  }
}

export function buildGoogleAuthorizationUrl(state: string): string | null {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const redirectUri = buildGoogleRedirectUri();
  if (!clientId || !redirectUri) return null;

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

export async function fetchGoogleUserInfo(code: string): Promise<GoogleUserInfo | null> {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = buildGoogleRedirectUri();
  if (!clientId || !clientSecret || !redirectUri) return null;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) {
    console.error("[google-auth] token exchange failed", await tokenResponse.text());
    return null;
  }

  const tokenData = await tokenResponse.json() as { access_token?: string };
  if (!tokenData.access_token) return null;

  const userInfoResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!userInfoResponse.ok) {
    console.error("[google-auth] userinfo failed", await userInfoResponse.text());
    return null;
  }

  const userInfo = await userInfoResponse.json() as GoogleUserInfo;
  if (!userInfo.sub || !userInfo.email) return null;
  return {
    ...userInfo,
    email: userInfo.email.trim().toLowerCase(),
  };
}

export async function createSignedInResponse(input: {
  requestDeviceToken?: string;
  userId: string;
  redirectTo: string;
  setupSessionMaxAge?: number;
}) {
  const now = new Date().toISOString();
  const sessionToken = generateSessionToken();
  const sessionMaxAge = input.setupSessionMaxAge ?? SESSION_MAX_AGE;
  const expiresAt = new Date(Date.now() + sessionMaxAge * 1000).toISOString();

  await db.insert(authSessions).values({
    userId: input.userId,
    sessionToken,
    expiresAt,
  });

  const { deviceToken } = await storeDeviceFullAuth({
    deviceToken: input.requestDeviceToken,
    userId: input.userId,
    authenticatedAt: now,
  });

  const response = NextResponse.redirect(input.redirectTo);
  response.cookies.set(
    AUTH_SESSION_COOKIE,
    sessionToken,
    buildAuthCookieOptions(sessionMaxAge),
  );
  setDeviceAuthCookie(response, deviceToken);
  clearLegacyLastUserCookie(response);
  return response;
}

export function readDeviceTokenFromRequest(request: Request): string | undefined {
  const cookie = request.headers.get("cookie") ?? "";
  return cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${DEVICE_AUTH_COOKIE}=`))
    ?.slice(DEVICE_AUTH_COOKIE.length + 1);
}
