// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { NextRequest, NextResponse } from "next/server";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { sharedSignupRequests, users } from "@/db/schema";
import {
  buildExpiredAuthCookieOptions,
} from "@/lib/auth";
import {
  GOOGLE_AUTH_PROVIDER,
  GOOGLE_OAUTH_STATE_COOKIE,
  decodeGoogleState,
  fetchGoogleUserInfo,
  createSignedInResponse,
} from "@/lib/google-auth";
import { DEVICE_AUTH_COOKIE } from "@/lib/device-auth";

const SETUP_SESSION_MAX_AGE = 60 * 15;

function absoluteUrl(request: NextRequest, pathname: string) {
  return new URL(pathname, request.nextUrl.origin).toString();
}

function errorRedirect(request: NextRequest, pathname: string, message: string) {
  const url = new URL(pathname, request.nextUrl.origin);
  url.searchParams.set("error", message);
  const response = NextResponse.redirect(url);
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, "", buildExpiredAuthCookieOptions());
  return response;
}

/** GET /api/auth/google/callback — complete Google OAuth */
export async function GET(request: NextRequest) {
  const error = request.nextUrl.searchParams.get("error");
  if (error) {
    return errorRedirect(request, "/pin/login", "google-cancelled");
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const stateCookie = request.cookies.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;
  if (!code || !state || !stateCookie || state !== stateCookie) {
    return errorRedirect(request, "/pin/login", "invalid-google-state");
  }

  const statePayload = decodeGoogleState(state);
  if (!statePayload) {
    return errorRedirect(request, "/pin/login", "invalid-google-state");
  }

  const googleUser = await fetchGoogleUserInfo(code);
  if (!googleUser || googleUser.email_verified === false) {
    return errorRedirect(request, "/pin/login", "google-email-unverified");
  }

  const deviceToken = request.cookies.get(DEVICE_AUTH_COOKIE)?.value;
  const now = new Date().toISOString();

  if (statePayload.mode === "login") {
    const user = await db.query.users.findFirst({
      where: or(
        eq(users.googleSub, googleUser.sub),
        and(
          eq(users.email, googleUser.email),
          eq(users.authProvider, GOOGLE_AUTH_PROVIDER),
        ),
      ),
    });

    if (!user || user.authProvider !== GOOGLE_AUTH_PROVIDER) {
      return errorRedirect(request, "/pin/login", "google-user-not-found");
    }

    await db
      .update(users)
      .set({
        googleSub: user.googleSub ?? googleUser.sub,
        lastFullAuthAt: now,
      })
      .where(eq(users.id, user.id));

    const redirectPath = user.pinHash ? (statePayload.redirectTo ?? "/boards") : "/pin/setup";
    const response = await createSignedInResponse({
      requestDeviceToken: deviceToken,
      userId: user.id,
      redirectTo: absoluteUrl(request, redirectPath),
      setupSessionMaxAge: user.pinHash ? undefined : SETUP_SESSION_MAX_AGE,
    });
    response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, "", buildExpiredAuthCookieOptions());
    return response;
  }

  if (statePayload.mode === "owner-signup") {
    if (!statePayload.userId || !statePayload.phoneNumber) {
      return errorRedirect(request, "/signup", "invalid-signup-state");
    }

    const existingUser = await db.query.users.findFirst({
      where: or(
        eq(users.userId, statePayload.userId),
        eq(users.email, googleUser.email),
        eq(users.phoneNumber, statePayload.phoneNumber),
        eq(users.googleSub, googleUser.sub),
      ),
    });
    if (existingUser) {
      return errorRedirect(request, "/signup", "user-already-exists");
    }

    const [createdUser] = await db
      .insert(users)
      .values({
        userId: statePayload.userId,
        email: googleUser.email,
        phoneNumber: statePayload.phoneNumber,
        passwordHash: null,
        authProvider: GOOGLE_AUTH_PROVIDER,
        googleSub: googleUser.sub,
        attribute: "owner",
        role: "admin",
        lastFullAuthAt: now,
      })
      .returning();

    const response = await createSignedInResponse({
      requestDeviceToken: deviceToken,
      userId: createdUser.id,
      redirectTo: absoluteUrl(request, "/pin/setup"),
      setupSessionMaxAge: SETUP_SESSION_MAX_AGE,
    });
    response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, "", buildExpiredAuthCookieOptions());
    return response;
  }

  if (statePayload.mode === "shared-signup") {
    if (!statePayload.sharedSignupToken) {
      return errorRedirect(request, "/signup/shared", "invalid-signup-state");
    }

    const signupRequest = await db.query.sharedSignupRequests.findFirst({
      where: and(
        eq(sharedSignupRequests.token, statePayload.sharedSignupToken),
        isNull(sharedSignupRequests.completedAt),
        gt(sharedSignupRequests.expiresAt, now),
      ),
    });
    if (!signupRequest) {
      return errorRedirect(request, "/signup/shared", "invalid-invitation");
    }
    if (signupRequest.email !== googleUser.email) {
      return errorRedirect(request, "/signup/shared", "google-email-mismatch");
    }

    const existingUser = await db.query.users.findFirst({
      where: or(
        eq(users.userId, signupRequest.userId),
        eq(users.email, signupRequest.email),
        eq(users.googleSub, googleUser.sub),
      ),
    });
    if (existingUser) {
      return errorRedirect(request, "/signup/shared", "user-already-exists");
    }

    const [createdUser] = await db
      .insert(users)
      .values({
        userId: signupRequest.userId,
        email: signupRequest.email,
        passwordHash: null,
        authProvider: GOOGLE_AUTH_PROVIDER,
        googleSub: googleUser.sub,
        attribute: "shared",
        ownerUserId: signupRequest.ownerUserId,
        role: signupRequest.role,
        lastFullAuthAt: now,
      })
      .returning();

    await db
      .update(sharedSignupRequests)
      .set({ completedAt: now })
      .where(eq(sharedSignupRequests.id, signupRequest.id));

    const response = await createSignedInResponse({
      requestDeviceToken: deviceToken,
      userId: createdUser.id,
      redirectTo: absoluteUrl(request, "/pin/setup"),
      setupSessionMaxAge: SETUP_SESSION_MAX_AGE,
    });
    response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, "", buildExpiredAuthCookieOptions());
    return response;
  }

  return errorRedirect(request, "/pin/login", "invalid-google-mode");
}
