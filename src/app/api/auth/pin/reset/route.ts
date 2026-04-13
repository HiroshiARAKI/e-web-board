// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { settings, pinResetTokens } from "@/db/schema";
import { eq, and, isNull, gt } from "drizzle-orm";
import { hashPin, PIN_SETTINGS } from "@/lib/pin";

/** POST /api/auth/pin/reset — change PIN using a valid reset token */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { token, pin } = body as { token?: string; pin?: string };

  if (!token) {
    return NextResponse.json(
      { error: "トークンが必要です" },
      { status: 400 },
    );
  }
  if (!pin || !/^\d{6}$/.test(pin)) {
    return NextResponse.json(
      { error: "PINは6桁の数字で入力してください" },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();

  // Find valid (unused, not expired) token
  const resetToken = await db.query.pinResetTokens.findFirst({
    where: and(
      eq(pinResetTokens.token, token),
      isNull(pinResetTokens.usedAt),
      gt(pinResetTokens.expiresAt, now),
    ),
  });

  if (!resetToken) {
    return NextResponse.json(
      { error: "無効または期限切れのトークンです" },
      { status: 400 },
    );
  }

  // Mark token as used
  await db
    .update(pinResetTokens)
    .set({ usedAt: now })
    .where(eq(pinResetTokens.id, resetToken.id));

  // Update PIN hash
  const pinHash = hashPin(pin);
  await db
    .update(settings)
    .set({ value: pinHash, updatedAt: now })
    .where(eq(settings.key, PIN_SETTINGS.PIN_HASH));

  return NextResponse.json({ success: true });
}
