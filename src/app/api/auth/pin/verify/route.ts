// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, authSessions, pinAttempts, settings } from "@/db/schema";
import { eq, and, gt, isNotNull } from "drizzle-orm";
import {
  verifyPin,
  generateSessionToken,
  MAX_PIN_ATTEMPTS,
  IP_BLOCK_DURATION_MS,
} from "@/lib/pin";
import {
  AUTH_SESSION_COOKIE,
  SESSION_MAX_AGE,
  DEFAULT_AUTH_EXPIRE_DAYS,
  AUTH_EXPIRE_DAYS_KEY,
  isFullAuthValid,
  LAST_USER_COOKIE,
} from "@/lib/auth";

/** POST /api/auth/pin/verify — verify PIN and issue session */
export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  // Check IP block
  const blockThreshold = new Date(
    Date.now() - IP_BLOCK_DURATION_MS,
  ).toISOString();
  const recentAttempts = await db
    .select()
    .from(pinAttempts)
    .where(
      and(
        eq(pinAttempts.ipAddress, ip),
        gt(pinAttempts.attemptedAt, blockThreshold),
      ),
    );

  if (recentAttempts.length >= MAX_PIN_ATTEMPTS) {
    return NextResponse.json(
      {
        error:
          "試行回数の上限に達しました。24時間後に再度お試しください。",
        blocked: true,
      },
      { status: 429 },
    );
  }

  const body = await request.json();
  const { pin } = body as { pin?: string };

  if (!pin || !/^\d{6}$/.test(pin)) {
    return NextResponse.json(
      { error: "PINは6桁の数字で入力してください" },
      { status: 400 },
    );
  }

  // Resolve target user — same logic as pin/page.tsx:
  //   - If LAST_USER_COOKIE user exists and has a PIN → that user
  //   - If cookie user has no PIN or not found → first user with a PIN
  const cookieStore = request.cookies;
  const lastUserId = cookieStore.get(LAST_USER_COOKIE)?.value;
  let adminUser = lastUserId
    ? await db.query.users.findFirst({ where: eq(users.userId, lastUserId) })
    : null;

  if (!adminUser?.pinHash) {
    // Cookie user has no PIN (or not found) — fall back to first user with a PIN
    const userWithPin = await db.query.users.findFirst({ where: isNotNull(users.pinHash) });
    adminUser = userWithPin ?? adminUser;
  }
  if (!adminUser?.pinHash) {
    return NextResponse.json(
      { error: "PINが設定されていません" },
      { status: 400 },
    );
  }

  // Check full-auth validity
  const expireSetting = await db.query.settings.findFirst({
    where: eq(settings.key, AUTH_EXPIRE_DAYS_KEY),
  });
  const expireDays = expireSetting?.value
    ? parseInt(expireSetting.value, 10)
    : DEFAULT_AUTH_EXPIRE_DAYS;

  if (!isFullAuthValid(adminUser.lastFullAuthAt, expireDays)) {
    return NextResponse.json(
      { error: "メールアドレスとパスワードによる認証が必要です", requiresFullAuth: true },
      { status: 403 },
    );
  }

  if (!verifyPin(pin, adminUser.pinHash)) {
    // Record failed attempt
    await db.insert(pinAttempts).values({ ipAddress: ip });

    const remaining = MAX_PIN_ATTEMPTS - (recentAttempts.length + 1);
    return NextResponse.json(
      {
        error: `PINが正しくありません${remaining > 0 ? `（残り${remaining}回）` : ""}`,
        remaining,
      },
      { status: 401 },
    );
  }

  // Success — clear previous attempts for this IP
  await db.delete(pinAttempts).where(eq(pinAttempts.ipAddress, ip));

  // Create session in authSessions table
  const sessionToken = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000).toISOString();

  await db.insert(authSessions).values({
    userId: adminUser.id,
    sessionToken,
    expiresAt,
  });

  const res = NextResponse.json({ success: true });
  res.cookies.set(AUTH_SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  // Keep LAST_USER_COOKIE up-to-date so next logout shows the correct PIN screen
  res.cookies.set(LAST_USER_COOKIE, adminUser.userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
  return res;
}
