// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, authSessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPin, verifyPin } from "@/lib/pin";
import { AUTH_SESSION_COOKIE } from "@/lib/auth";
import { cookies } from "next/headers";

/** PATCH /api/auth/pin/change — change PIN or email (requires active session) */
export async function PATCH(request: NextRequest) {
  // Verify session
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(AUTH_SESSION_COOKIE)?.value;
  if (!sessionToken) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const session = await db.query.authSessions.findFirst({
    where: eq(authSessions.sessionToken, sessionToken),
    with: { user: true },
  });
  if (!session || session.expiresAt < new Date().toISOString()) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const body = await request.json();
  const { action, currentPin, newPin, newEmail } = body as {
    action: "verifyCurrentPin" | "changePin" | "changeEmail";
    currentPin?: string;
    newPin?: string;
    newEmail?: string;
  };

  const adminUser = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
  });
  if (!adminUser) {
    return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
  }

  if (action === "verifyCurrentPin") {
    if (!currentPin || !/^\d{6}$/.test(currentPin)) {
      return NextResponse.json(
        { error: "PINを正しく入力してください" },
        { status: 400 },
      );
    }
    if (!adminUser.pinHash || !verifyPin(currentPin, adminUser.pinHash)) {
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

    if (!adminUser.pinHash || !verifyPin(currentPin, adminUser.pinHash)) {
      return NextResponse.json(
        { error: "現在のPINが正しくありません" },
        { status: 401 },
      );
    }

    await db
      .update(users)
      .set({ pinHash: hashPin(newPin) })
      .where(eq(users.id, adminUser.id));

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
      .update(users)
      .set({ email: newEmail })
      .where(eq(users.id, adminUser.id));

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "不正なアクションです" }, { status: 400 });
}
