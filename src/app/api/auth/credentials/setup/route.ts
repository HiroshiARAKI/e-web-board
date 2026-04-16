// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, AUTH_SESSION_COOKIE } from "@/lib/auth";
import { generateSessionToken } from "@/lib/pin";

/** POST /api/auth/credentials/setup — initial admin user registration */
export async function POST(request: NextRequest) {
  // Ensure no user exists yet
  const existing = await db.select().from(users).limit(1);
  if (existing.length > 0) {
    return NextResponse.json(
      { error: "管理者は既に登録されています" },
      { status: 400 },
    );
  }

  const body = await request.json();
  const { userId, email, password } = body as {
    userId?: string;
    email?: string;
    password?: string;
  };

  if (
    !userId ||
    !/^[a-zA-Z0-9_\-]{3,32}$/.test(userId)
  ) {
    return NextResponse.json(
      {
        error:
          "ユーザーIDは3〜32文字の英数字・アンダースコア・ハイフンで入力してください",
      },
      { status: 400 },
    );
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "有効なメールアドレスを入力してください" },
      { status: 400 },
    );
  }
  if (!password || password.length < 8) {
    return NextResponse.json(
      { error: "パスワードは8文字以上で入力してください" },
      { status: 400 },
    );
  }

  const passwordHash = await hashPassword(password);

  await db.insert(users).values({
    userId,
    email,
    passwordHash,
    role: "admin",
    lastFullAuthAt: new Date().toISOString(),
  });

  // Return a setup-complete token for the PIN setup step (short TTL client-side token)
  const setupToken = generateSessionToken();

  const res = NextResponse.json({ success: true, setupToken });
  // Provide a temporary setup cookie so PIN setup route can verify continuity
  res.cookies.set(AUTH_SESSION_COOKIE, setupToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 15, // 15 minutes for setup
  });
  return res;
}
