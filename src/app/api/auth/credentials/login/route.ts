// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, pinAttempts, authSessions } from "@/db/schema";
import { eq, or, and, gt } from "drizzle-orm";
import {
  verifyPassword,
  AUTH_SESSION_COOKIE,
  SESSION_MAX_AGE,
} from "@/lib/auth";
import {
  DEVICE_AUTH_COOKIE,
  clearLegacyLastUserCookie,
  setDeviceAuthCookie,
  storeDeviceFullAuth,
} from "@/lib/device-auth";
import {
  MAX_PIN_ATTEMPTS,
  IP_BLOCK_DURATION_MS,
  generateSessionToken,
} from "@/lib/pin";

/** POST /api/auth/credentials/login — email/userId + password login */
export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  // IP rate-limit (shared with PIN attempts)
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
  const { identifier, password } = body as {
    identifier?: string;
    password?: string;
  };

  if (!identifier || !password) {
    return NextResponse.json(
      { error: "ユーザーIDまたはメールアドレスとパスワードを入力してください" },
      { status: 400 },
    );
  }

  const user = await db.query.users.findFirst({
    where: or(
      eq(users.email, identifier),
      eq(users.userId, identifier),
    ),
  });

  console.log("[credentials/login] User lookup", {
    identifier,
    found: !!user,
    userId: user?.userId ?? null,
  });

  // Constant-time failure to prevent user enumeration
  if (!user) {
    await db.insert(pinAttempts).values({ ipAddress: ip });
    return NextResponse.json(
      { error: "ユーザーIDまたはパスワードが正しくありません" },
      { status: 401 },
    );
  }

  const valid = await verifyPassword(password, user.passwordHash);
  console.log("[credentials/login] Password verify result", {
    userId: user.userId,
    valid,
    pwHashLen: user.passwordHash?.length ?? 0,
  });
  if (!valid) {
    await db.insert(pinAttempts).values({ ipAddress: ip });
    const remaining = MAX_PIN_ATTEMPTS - (recentAttempts.length + 1);
    return NextResponse.json(
      {
        error: `ユーザーIDまたはパスワードが正しくありません${remaining > 0 ? `（残り${remaining}回）` : ""}`,
        remaining,
      },
      { status: 401 },
    );
  }

  // Clear IP attempts on success
  await db.delete(pinAttempts).where(eq(pinAttempts.ipAddress, ip));

  console.log("[credentials/login] Password verified OK for", user.userId);

  const now = new Date().toISOString();

  // Record full-auth timestamp
  await db
    .update(users)
    .set({ lastFullAuthAt: now })
    .where(eq(users.id, user.id));

  const { deviceToken } = await storeDeviceFullAuth({
    deviceToken: request.cookies.get(DEVICE_AUTH_COOKIE)?.value,
    userId: user.id,
    authenticatedAt: now,
  });

  // Create session
  const sessionToken = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000).toISOString();

  await db.insert(authSessions).values({
    userId: user.id,
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
  setDeviceAuthCookie(res, deviceToken);
  clearLegacyLastUserCookie(res);
  return res;
}
