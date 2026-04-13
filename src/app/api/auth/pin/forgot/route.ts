// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { settings, pinResetTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateResetToken, PIN_SETTINGS, RESET_TOKEN_TTL_MS } from "@/lib/pin";

/** POST /api/auth/pin/forgot — verify email and issue reset token */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email } = body as { email?: string };

  if (!email) {
    return NextResponse.json(
      { error: "メールアドレスを入力してください" },
      { status: 400 },
    );
  }

  const row = await db.query.settings.findFirst({
    where: eq(settings.key, PIN_SETTINGS.PIN_EMAIL),
  });

  if (!row?.value || row.value !== email) {
    // Always return success to prevent email enumeration
    return NextResponse.json({ success: true });
  }

  // Generate reset token
  const token = generateResetToken();
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();

  await db.insert(pinResetTokens).values({ token, expiresAt });

  // Build reset URL
  const host = request.headers.get("host") || "localhost:3000";
  const protocol = request.headers.get("x-forwarded-proto") || "http";
  const resetUrl = `${protocol}://${host}/pin/reset/${token}`;

  return NextResponse.json({ success: true, resetUrl });
}
