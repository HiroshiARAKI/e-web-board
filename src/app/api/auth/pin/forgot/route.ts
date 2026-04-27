// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, pinResetTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateResetToken, RESET_TOKEN_TTL_MS } from "@/lib/pin";
import { isSmtpConfigured, sendPinResetEmail } from "@/lib/mail";
import { isValidSignupEmail, normalizeSignupEmail } from "@/lib/signup";

function getPinResetPublicOrigin(): string | null {
  const configuredOrigin = process.env.APP_PUBLIC_ORIGIN?.trim();
  if (!configuredOrigin) {
    return null;
  }

  try {
    return new URL(configuredOrigin).origin;
  } catch {
    console.error("[pin/forgot] APP_PUBLIC_ORIGIN is invalid");
    return null;
  }
}

/** POST /api/auth/pin/forgot — verify email and issue reset token */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email } = body as { email?: string };
  const normalizedEmail = typeof email === "string" ? normalizeSignupEmail(email) : "";

  if (!normalizedEmail) {
    return NextResponse.json(
      { error: "メールアドレスを入力してください" },
      { status: 400 },
    );
  }

  if (!isValidSignupEmail(normalizedEmail)) {
    return NextResponse.json(
      { error: "有効なメールアドレスを入力してください" },
      { status: 400 },
    );
  }

  const publicOrigin = getPinResetPublicOrigin();
  if (!isSmtpConfigured() || !publicOrigin) {
    return NextResponse.json(
      { error: "この環境ではメールによるPIN初期化を利用できません" },
      { status: 503 },
    );
  }

  const adminUser = await db.query.users.findFirst({
    where: eq(users.email, normalizedEmail),
  });

  if (!adminUser) {
    return NextResponse.json(
      { error: "登録済みのメールアドレスを入力してください" },
      { status: 400 },
    );
  }

  // Generate reset token
  const token = generateResetToken();
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();

  await db.insert(pinResetTokens).values({ token, expiresAt, userId: adminUser.id });

  const resetUrl = `${publicOrigin}/pin/reset/${token}`;

  const mailSent = await sendPinResetEmail(normalizedEmail, resetUrl);
  if (!mailSent) {
    return NextResponse.json(
      { error: "初期化メールの送信に失敗しました" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, method: "email" });
}
