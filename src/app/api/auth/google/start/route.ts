// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { NextRequest, NextResponse } from "next/server";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { googleOAuthFlows, sharedSignupRequests } from "@/db/schema";
import {
  GOOGLE_OAUTH_STATE_COOKIE,
  GOOGLE_OAUTH_STATE_MAX_AGE,
  buildGoogleAuthorizationUrl,
  createGoogleOAuthFlowContext,
  isGoogleAuthEnabled,
  type GoogleAuthMode,
} from "@/lib/google-auth";
import { buildAuthCookieOptions } from "@/lib/auth";
import { getPublicAppOrigin } from "@/lib/public-origin";

function isAllowedRedirectTo(value: string | null): value is string {
  return !!value && value.startsWith("/") && !value.startsWith("//");
}

async function createAuthorization(input: {
  mode: GoogleAuthMode;
  redirectTo?: string | null;
  sharedSignupToken?: string | null;
}) {
  const flow = createGoogleOAuthFlowContext(input);
  const authorizationUrl = buildGoogleAuthorizationUrl({
    state: flow.state,
    codeChallenge: flow.codeChallenge,
    nonce: flow.nonce,
  });
  if (!authorizationUrl) {
    return null;
  }

  await db.insert(googleOAuthFlows).values({
    state: flow.state,
    mode: flow.mode,
    redirectTo: flow.redirectTo,
    sharedSignupToken: flow.sharedSignupToken,
    codeVerifier: flow.codeVerifier,
    nonce: flow.nonce,
    expiresAt: flow.expiresAt,
  });

  return { state: flow.state, authorizationUrl };
}

async function createAuthResponse(input: {
  mode: GoogleAuthMode;
  redirectTo?: string | null;
  sharedSignupToken?: string | null;
}) {
  const authorization = await createAuthorization(input);
  if (!authorization) {
    return NextResponse.json(
      { error: "Google認証の設定が不完全です" },
      { status: 503 },
    );
  }
  const response = NextResponse.json({
    authorizationUrl: authorization.authorizationUrl,
  });
  response.cookies.set(
    GOOGLE_OAUTH_STATE_COOKIE,
    authorization.state,
    buildAuthCookieOptions(GOOGLE_OAUTH_STATE_MAX_AGE),
  );
  return response;
}

function canonicalOriginRedirect(request: NextRequest) {
  const origin = getPublicAppOrigin();
  if (!origin) {
    return null;
  }

  const publicHost = new URL(origin).host.toLowerCase();
  const requestHost = request.headers.get("host")?.trim().toLowerCase();
  if (!requestHost || requestHost === publicHost) {
    return null;
  }

  const url = new URL(`${request.nextUrl.pathname}${request.nextUrl.search}`, `${origin}/`);
  return NextResponse.redirect(url);
}

/** GET /api/auth/google/start?mode=login — start Google login */
export async function GET(request: NextRequest) {
  if (!isGoogleAuthEnabled()) {
    return NextResponse.json(
      { error: "Google認証は有効化されていません" },
      { status: 503 },
    );
  }
  const canonicalRedirect = canonicalOriginRedirect(request);
  if (canonicalRedirect) {
    return canonicalRedirect;
  }

  const modeParam = request.nextUrl.searchParams.get("mode");
  const mode: GoogleAuthMode = modeParam === "owner-signup" ||
    modeParam === "shared-signup" ||
    modeParam === "login"
    ? modeParam
    : "login";

  const redirectToParam = request.nextUrl.searchParams.get("redirectTo");
  const redirectTo = isAllowedRedirectTo(redirectToParam) ? redirectToParam : "/boards";
  let sharedSignupToken: string | null = null;

  if (mode === "shared-signup") {
    sharedSignupToken = request.nextUrl.searchParams.get("token");
    const now = new Date().toISOString();
    const signupRequest = sharedSignupToken
      ? await db.query.sharedSignupRequests.findFirst({
          where: and(
            eq(sharedSignupRequests.token, sharedSignupToken),
            isNull(sharedSignupRequests.completedAt),
            gt(sharedSignupRequests.expiresAt, now),
          ),
        })
      : null;
    if (!signupRequest) {
      return NextResponse.json(
        { error: "無効または期限切れの招待リンクです" },
        { status: 400 },
      );
    }
  }

  const authorization = await createAuthorization({
    mode,
    redirectTo: mode === "login" ? redirectTo : null,
    sharedSignupToken,
  });
  if (!authorization) {
    return NextResponse.json(
      { error: "Google認証の設定が不完全です" },
      { status: 503 },
    );
  }

  const redirectResponse = NextResponse.redirect(authorization.authorizationUrl);
  redirectResponse.cookies.set(
    GOOGLE_OAUTH_STATE_COOKIE,
    authorization.state,
    buildAuthCookieOptions(GOOGLE_OAUTH_STATE_MAX_AGE),
  );
  return redirectResponse;
}

/** POST /api/auth/google/start — start Google login/signup */
export async function POST(request: NextRequest) {
  if (!isGoogleAuthEnabled()) {
    return NextResponse.json(
      { error: "Google認証は有効化されていません" },
      { status: 503 },
    );
  }

  const body = await request.json();
  const mode = body.mode as GoogleAuthMode | undefined;

  if (mode === "login") {
    const redirectTo = isAllowedRedirectTo(body.redirectTo) ? body.redirectTo : "/boards";
    return createAuthResponse({ mode, redirectTo });
  }

  if (mode === "owner-signup") {
    return createAuthResponse({ mode });
  }

  if (mode === "shared-signup") {
    const token = typeof body.token === "string" ? body.token : "";
    const now = new Date().toISOString();
    const signupRequest = await db.query.sharedSignupRequests.findFirst({
      where: and(
        eq(sharedSignupRequests.token, token),
        isNull(sharedSignupRequests.completedAt),
        gt(sharedSignupRequests.expiresAt, now),
      ),
    });
    if (!signupRequest) {
      return NextResponse.json(
        { error: "無効または期限切れの招待リンクです" },
        { status: 400 },
      );
    }

    return createAuthResponse({ mode, sharedSignupToken: token });
  }

  return NextResponse.json({ error: "不正な認証モードです" }, { status: 400 });
}
