// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { signupRequests, users } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { sendOwnerSignupEmail, isSmtpConfigured } from "@/lib/mail";
import {
  SIGNUP_REQUEST_COOKIE,
  SIGNUP_REQUEST_COOKIE_MAX_AGE,
  computeSignupExpiry,
  generateSignupToken,
  isValidSignupEmail,
  isValidSignupUserId,
  normalizePhoneNumber,
  normalizeSignupEmail,
} from "@/lib/signup";
import { networkInterfaces } from "os";

function buildSignupUrl(request: NextRequest, token: string): string {
  const requestHost = request.headers.get("host") || "localhost:3000";
  const protocol = request.headers.get("x-forwarded-proto") || "http";
  const hostname = requestHost.split(":")[0];
  const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";
  let host = requestHost;

  if (isLocalhost) {
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] ?? []) {
        if (net.family === "IPv4" && !net.internal) {
          const port = requestHost.includes(":") ? `:${requestHost.split(":")[1]}` : "";
          host = `${net.address}${port}`;
          break;
        }
      }
      if (host !== requestHost) {
        break;
      }
    }
  }

  return `${protocol}://${host}/signup/${token}`;
}

/** POST /api/auth/credentials/setup — request owner signup by email link */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { userId, email, phoneNumber } = body as {
    userId?: string;
    email?: string;
    phoneNumber?: string;
  };

  const normalizedUserId = userId?.trim() ?? "";
  const normalizedEmail = email ? normalizeSignupEmail(email) : "";

  if (
    !normalizedUserId ||
    !isValidSignupUserId(normalizedUserId)
  ) {
    return NextResponse.json(
      {
        error:
          "ユーザーIDは3〜32文字の英数字・アンダースコア・ハイフンで入力してください",
      },
      { status: 400 },
    );
  }
  if (!normalizedEmail || !isValidSignupEmail(normalizedEmail)) {
    return NextResponse.json(
      { error: "有効なメールアドレスを入力してください" },
      { status: 400 },
    );
  }
  const normalizedPhoneNumber =
    typeof phoneNumber === "string" ? normalizePhoneNumber(phoneNumber) : null;
  if (!normalizedPhoneNumber) {
    return NextResponse.json(
      { error: "電話番号を正しく入力してください" },
      { status: 400 },
    );
  }

  if (!isSmtpConfigured() && process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "現在メール送信を利用できません。管理者にお問い合わせください" },
      { status: 503 },
    );
  }

  const existingUser = await db.query.users.findFirst({
    where: or(
      eq(users.userId, normalizedUserId),
      eq(users.email, normalizedEmail),
      eq(users.phoneNumber, normalizedPhoneNumber),
    ),
  });
  if (existingUser) {
    return NextResponse.json(
      { error: "同じユーザーID・メールアドレス・電話番号では登録できません" },
      { status: 409 },
    );
  }

  const token = generateSignupToken();
  const expiresAt = computeSignupExpiry();
  const [signupRequest] = await db.insert(signupRequests).values({
    userId: normalizedUserId,
    email: normalizedEmail,
    phoneNumber: normalizedPhoneNumber,
    token,
    expiresAt,
  }).returning();

  const signupUrl = buildSignupUrl(request, token);
  const mailSent = await sendOwnerSignupEmail(normalizedEmail, signupUrl);

  if (!mailSent && isSmtpConfigured()) {
    return NextResponse.json(
      { error: "登録メールの送信に失敗しました。時間を置いて再度お試しください" },
      { status: 500 },
    );
  }

  const res = NextResponse.json({
    success: true,
    previewUrl:
      !mailSent && process.env.NODE_ENV !== "production"
        ? signupUrl
        : null,
  });
  res.cookies.set(SIGNUP_REQUEST_COOKIE, signupRequest.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SIGNUP_REQUEST_COOKIE_MAX_AGE,
  });
  return res;
}
