// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  hashPin,
  verifyPin,
  PIN_SETTINGS,
  PIN_SESSION_COOKIE,
} from "@/lib/pin";
import { cookies } from "next/headers";

/** PATCH /api/auth/pin/change — change PIN (requires current PIN) or email */
export async function PATCH(request: NextRequest) {
  // Verify session
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(PIN_SESSION_COOKIE)?.value;
  if (!sessionToken) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const storedSession = await db.query.settings.findFirst({
    where: eq(settings.key, PIN_SETTINGS.SESSION_SECRET),
  });
  if (!storedSession?.value || storedSession.value !== sessionToken) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const body = await request.json();
  const { action, currentPin, newPin, newEmail } = body as {
    action: "verifyCurrentPin" | "changePin" | "changeEmail";
    currentPin?: string;
    newPin?: string;
    newEmail?: string;
  };

  if (action === "verifyCurrentPin") {
    if (!currentPin || !/^\d{6}$/.test(currentPin)) {
      return NextResponse.json(
        { error: "PINを正しく入力してください" },
        { status: 400 },
      );
    }
    const row = await db.query.settings.findFirst({
      where: eq(settings.key, PIN_SETTINGS.PIN_HASH),
    });
    if (!row?.value || !verifyPin(currentPin, row.value)) {
      return NextResponse.json(
        { error: "PINが正しくありません" },
        { status: 401 },
      );
    }
    return NextResponse.json({ success: true });
  }

  if (action === "changePin") {
    if (!currentPin || !/^\d{6}$/.test(currentPin)) {
      return NextResponse.json(
        { error: "現在のPINを正しく入力してください" },
        { status: 400 },
      );
    }
    if (!newPin || !/^\d{6}$/.test(newPin)) {
      return NextResponse.json(
        { error: "新しいPINは6桁の数字で入力してください" },
        { status: 400 },
      );
    }

    // Verify current PIN
    const row = await db.query.settings.findFirst({
      where: eq(settings.key, PIN_SETTINGS.PIN_HASH),
    });
    if (!row?.value || !verifyPin(currentPin, row.value)) {
      return NextResponse.json(
        { error: "現在のPINが正しくありません" },
        { status: 401 },
      );
    }

    // Update PIN hash
    await db
      .insert(settings)
      .values({ key: PIN_SETTINGS.PIN_HASH, value: hashPin(newPin) })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: hashPin(newPin), updatedAt: new Date().toISOString() },
      });

    return NextResponse.json({ success: true });
  }

  if (action === "changeEmail") {
    if (!newEmail || !newEmail.includes("@")) {
      return NextResponse.json(
        { error: "有効なメールアドレスを入力してください" },
        { status: 400 },
      );
    }

    await db
      .insert(settings)
      .values({ key: PIN_SETTINGS.PIN_EMAIL, value: newEmail })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: newEmail, updatedAt: new Date().toISOString() },
      });

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "不正なアクションです" }, { status: 400 });
}
