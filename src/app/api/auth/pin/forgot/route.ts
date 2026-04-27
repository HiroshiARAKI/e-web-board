// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/db";
import { pinResetTokens } from "@/db/schema";
import { generateResetToken, RESET_TOKEN_TTL_MS } from "@/lib/pin";
import { isSmtpConfigured, sendPinResetEmail } from "@/lib/mail";
import { isValidSignupEmail, normalizeSignupEmail } from "@/lib/signup";
import { DEVICE_AUTH_COOKIE, getDeviceAuthGrantByToken } from "@/lib/device-auth";

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
  const { email, targetUserId } = body as { email?: string; targetUserId?: string };
  const normalizedEmail = typeof email === "string" ? normalizeSignupEmail(email) : "";
  const normalizedTargetUserId = typeof targetUserId === "string" ? targetUserId.trim() : "";

  if (!normalizedTargetUserId) {
    return NextResponse.json(
      { error: "PIN初期化対象のユーザーが不明です" },
      { status: 400 },
    );
  }

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

  const cookieStore = await cookies();
  const deviceToken = cookieStore.get(DEVICE_AUTH_COOKIE)?.value;
  const deviceAuthGrant = await getDeviceAuthGrantByToken(deviceToken);

  if (!deviceAuthGrant?.user) {
    return NextResponse.json(
      { error: "PIN初期化対象のユーザーを特定できません" },
      { status: 400 },
    );
  }

  if (deviceAuthGrant.user.userId !== normalizedTargetUserId) {
    return NextResponse.json(
      { error: "現在のPIN初期化対象ユーザーと一致しません" },
      { status: 400 },
    );
  }

  if (normalizeSignupEmail(deviceAuthGrant.user.email) !== normalizedEmail) {
    return NextResponse.json(
      { error: "このユーザーに登録されているメールアドレスを入力してください" },
      { status: 400 },
    );
  }

  // Generate reset token
  const token = generateResetToken();
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();

  await db.insert(pinResetTokens).values({
    token,
    expiresAt,
    userId: deviceAuthGrant.user.id,
  });

  const resetUrl = `${publicOrigin}/pin/reset/${token}`;

  const mailSent = await sendPinResetEmail(deviceAuthGrant.user.email, resetUrl);
  if (!mailSent) {
    return NextResponse.json(
      { error: "初期化メールの送信に失敗しました" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, method: "email" });
}
