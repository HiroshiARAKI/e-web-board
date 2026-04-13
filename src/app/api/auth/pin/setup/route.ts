// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  hashPin,
  generateSessionToken,
  PIN_SESSION_COOKIE,
  PIN_SESSION_MAX_AGE,
  PIN_SETTINGS,
} from "@/lib/pin";

/** POST /api/auth/pin/setup — initial PIN + email registration */
export async function POST(request: NextRequest) {
  // Check PIN is not already set
  const existing = await db.query.settings.findFirst({
    where: eq(settings.key, PIN_SETTINGS.PIN_HASH),
  });
  if (existing?.value) {
    return NextResponse.json(
      { error: "PINは既に設定されています" },
      { status: 400 },
    );
  }

  const body = await request.json();
  const { pin, email } = body as { pin?: string; email?: string };

  if (!pin || !/^\d{6}$/.test(pin)) {
    return NextResponse.json(
      { error: "PINは6桁の数字で入力してください" },
      { status: 400 },
    );
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "有効なメールアドレスを入力してください" },
      { status: 400 },
    );
  }

  const pinHash = hashPin(pin);

  // Save PIN hash and email
  await db
    .insert(settings)
    .values([
      { key: PIN_SETTINGS.PIN_HASH, value: pinHash },
      { key: PIN_SETTINGS.PIN_EMAIL, value: email },
    ])
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: pinHash, updatedAt: new Date().toISOString() },
    });

  // Also save email separately (onConflictDoUpdate uses the last set value)
  await db
    .insert(settings)
    .values({ key: PIN_SETTINGS.PIN_EMAIL, value: email })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: email, updatedAt: new Date().toISOString() },
    });

  // Create session
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
