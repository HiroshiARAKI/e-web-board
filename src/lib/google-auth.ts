// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { createHash, randomBytes } from "crypto";
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

export interface GoogleOAuthFlowContext {
  mode: GoogleAuthMode;
  redirectTo: string | null;
  sharedSignupToken: string | null;
  state: string;
  codeVerifier: string;
  codeChallenge: string;
  nonce: string;
  expiresAt: string;
}

export interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
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

function randomOAuthValue(byteLength = 32): string {
  return randomBytes(byteLength).toString("base64url");
}

function computeCodeChallenge(codeVerifier: string): string {
  return createHash("sha256").update(codeVerifier).digest("base64url");
}

export function createGoogleOAuthFlowContext(input: {
  mode: GoogleAuthMode;
  redirectTo?: string | null;
  sharedSignupToken?: string | null;
}): GoogleOAuthFlowContext {
  const codeVerifier = randomOAuthValue(64);

  return {
    mode: input.mode,
    redirectTo: input.redirectTo ?? null,
    sharedSignupToken: input.sharedSignupToken ?? null,
    state: randomOAuthValue(32),
    codeVerifier,
    codeChallenge: computeCodeChallenge(codeVerifier),
    nonce: randomOAuthValue(32),
    expiresAt: new Date(Date.now() + GOOGLE_OAUTH_STATE_MAX_AGE * 1000).toISOString(),
  };
}

export function buildGoogleAuthorizationUrl(input: {
  state: string;
  codeChallenge: string;
  nonce: string;
}): string | null {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const redirectUri = buildGoogleRedirectUri();
  if (!clientId || !redirectUri) return null;

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", input.state);
  url.searchParams.set("nonce", input.nonce);
  url.searchParams.set("code_challenge", input.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

function decodeJwtPayload<T>(jwt: string): T | null {
  const [, payload] = jwt.split(".");
  if (!payload) return null;
  const decoded = base64UrlDecode(payload);
  if (!decoded) return null;

  try {
    return JSON.parse(decoded) as T;
  } catch {
    return null;
  }
}

function isValidGoogleIdTokenPayload(input: {
  idToken?: string;
  expectedNonce: string;
  clientId: string;
}) {
  if (!input.idToken) return false;

  const payload = decodeJwtPayload<{
    aud?: string;
    exp?: number;
    iss?: string;
    nonce?: string;
  }>(input.idToken);
  if (!payload) return false;

  const validIssuer = payload.iss === "https://accounts.google.com" ||
    payload.iss === "accounts.google.com";
  const validAudience = payload.aud === input.clientId;
  const validExpiry = typeof payload.exp === "number" &&
    payload.exp * 1000 > Date.now();
  const validNonce = payload.nonce === input.expectedNonce;

  return validIssuer && validAudience && validExpiry && validNonce;
}

export async function fetchGoogleUserInfo(input: {
  code: string;
  codeVerifier: string;
  expectedNonce: string;
}): Promise<GoogleUserInfo | null> {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = buildGoogleRedirectUri();
  if (!clientId || !clientSecret || !redirectUri) return null;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: input.code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      code_verifier: input.codeVerifier,
    }),
  });

  if (!tokenResponse.ok) {
    console.error("[google-auth] token exchange failed", await tokenResponse.text());
    return null;
  }

  const tokenData = await tokenResponse.json() as {
    access_token?: string;
    id_token?: string;
  };
  if (!tokenData.access_token) return null;
  if (!isValidGoogleIdTokenPayload({
    idToken: tokenData.id_token,
    expectedNonce: input.expectedNonce,
    clientId,
  })) {
    console.error("[google-auth] id token validation failed");
    return null;
  }

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
