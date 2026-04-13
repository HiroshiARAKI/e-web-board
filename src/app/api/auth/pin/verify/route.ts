// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { settings, pinAttempts } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import {
  verifyPin,
  generateSessionToken,
  PIN_SESSION_COOKIE,
  PIN_SESSION_MAX_AGE,
  PIN_SETTINGS,
  MAX_PIN_ATTEMPTS,
  IP_BLOCK_DURATION_MS,
} from "@/lib/pin";

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

  const row = await db.query.settings.findFirst({
    where: eq(settings.key, PIN_SETTINGS.PIN_HASH),
  });

  if (!row?.value) {
    return NextResponse.json(
      { error: "PINが設定されていません" },
      { status: 400 },
    );
  }

  if (!verifyPin(pin, row.value)) {
    // Record failed attempt
    await db.insert(pinAttempts).values({ ipAddress: ip });

    const remaining =
      MAX_PIN_ATTEMPTS - (recentAttempts.length + 1);
    return NextResponse.json(
      {
        error: `PINが正しくありません${remaining > 0 ? `（残り${remaining}回）` : ""}`,
        remaining,
      },
      { status: 401 },
    );
  }

  // Success — clear previous attempts for this IP
  await db
    .delete(pinAttempts)
    .where(eq(pinAttempts.ipAddress, ip));

  // Create/rotate session token
  const sessionToken = generateSessionToken();
  await db
    .insert(settings)
    .values({ key: PIN_SETTINGS.SESSION_SECRET, value: sessionToken })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: sessionToken, updatedAt: new Date().toISOString() },
    });

  const res = NextResponse.json({ success: true });
  res.cookies.set(PIN_SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: PIN_SESSION_MAX_AGE,
  });
  return res;
}
