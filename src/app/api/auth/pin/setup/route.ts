// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, authSessions, settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPin, generateSessionToken } from "@/lib/pin";
import {
  AUTH_SESSION_COOKIE,
  SESSION_MAX_AGE,
  DEFAULT_AUTH_EXPIRE_DAYS,
  AUTH_EXPIRE_DAYS_KEY,
  isFullAuthValid,
} from "@/lib/auth";
import { cookies } from "next/headers";

/** POST /api/auth/pin/setup — set initial PIN for the admin user */
export async function POST(request: NextRequest) {
  // Verify that at least one user (admin) exists
  const adminUser = await db.query.users.findFirst();
  if (!adminUser) {
    return NextResponse.json(
      { error: "管理者アカウントが未登録です。先にメールアドレスとパスワードを登録してください" },
      { status: 400 },
    );
  }

  // Check that PIN is not already set
  if (adminUser.pinHash) {
    return NextResponse.json(
      { error: "PINは既に設定されています" },
      { status: 400 },
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

  // Retrieve configured auth expire days
  const expireSetting = await db.query.settings.findFirst({
    where: eq(settings.key, AUTH_EXPIRE_DAYS_KEY),
  });
  const expireDays = expireSetting?.value
    ? parseInt(expireSetting.value, 10)
    : DEFAULT_AUTH_EXPIRE_DAYS;

  // Verify full-auth is still valid (set during credentials/setup)
  if (!isFullAuthValid(adminUser.lastFullAuthAt, expireDays)) {
    return NextResponse.json(
      { error: "認証セッションが無効です。再度ログインしてください" },
      { status: 401 },
    );
  }

  // Save PIN hash to users table
  await db
    .update(users)
    .set({ pinHash: hashPin(pin) })
    .where(eq(users.id, adminUser.id));

  // Delete any previous setup cookie session
  const cookieStore = await cookies();
  const existingToken = cookieStore.get(AUTH_SESSION_COOKIE)?.value;
  if (existingToken) {
    await db
      .delete(authSessions)
      .where(eq(authSessions.sessionToken, existingToken));
  }

  // Create a proper auth session
  const sessionToken = generateSessionToken();
  const expiresAt = new Date(
    Date.now() + SESSION_MAX_AGE * 1000,
  ).toISOString();

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
  return res;
}

