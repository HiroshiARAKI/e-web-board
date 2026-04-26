// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, authSessions } from "@/db/schema";
import { hashPassword, AUTH_SESSION_COOKIE, LAST_USER_COOKIE } from "@/lib/auth";
import { generateSessionToken } from "@/lib/pin";
import { eq, or } from "drizzle-orm";

const SETUP_SESSION_MAX_AGE = 60 * 15;

function normalizePhoneNumber(input: string): string | null {
  const digits = input.replace(/\D/g, "");

  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }

  return null;
}

/** POST /api/auth/credentials/setup — owner user registration */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { userId, email, password, phoneNumber } = body as {
    userId?: string;
    email?: string;
    password?: string;
    phoneNumber?: string;
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
  const normalizedPhoneNumber =
    typeof phoneNumber === "string" ? normalizePhoneNumber(phoneNumber) : null;
  if (!normalizedPhoneNumber) {
    return NextResponse.json(
      { error: "電話番号を正しく入力してください" },
      { status: 400 },
    );
  }
  if (!password || password.length < 8) {
    return NextResponse.json(
      { error: "パスワードは8文字以上で入力してください" },
      { status: 400 },
    );
  }

  const existingUser = await db.query.users.findFirst({
    where: or(
      eq(users.userId, userId),
      eq(users.email, email),
      eq(users.phoneNumber, normalizedPhoneNumber),
    ),
  });
  if (existingUser) {
    return NextResponse.json(
      { error: "同じユーザーID・メールアドレス・電話番号では登録できません" },
      { status: 409 },
    );
  }

  const passwordHash = await hashPassword(password);
  const now = new Date().toISOString();
  const sessionToken = generateSessionToken();
  const expiresAt = new Date(Date.now() + SETUP_SESSION_MAX_AGE * 1000).toISOString();

  const [createdUser] = await db.insert(users).values({
    userId,
    email,
    phoneNumber: normalizedPhoneNumber,
    passwordHash,
    attribute: "owner",
    role: "admin",
    lastFullAuthAt: now,
  }).returning();

  await db.insert(authSessions).values({
    userId: createdUser.id,
    sessionToken,
    expiresAt,
  });

  const res = NextResponse.json({ success: true });
  res.cookies.set(AUTH_SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SETUP_SESSION_MAX_AGE,
  });
  res.cookies.set(LAST_USER_COOKIE, createdUser.userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
