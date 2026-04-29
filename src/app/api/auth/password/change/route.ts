// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, authSessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword, hashPassword, AUTH_SESSION_COOKIE } from "@/lib/auth";
import { cookies } from "next/headers";

/** PATCH /api/auth/password/change — change admin password (requires current password) */
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
  const { currentPassword, newPassword } = body as {
    currentPassword?: string;
    newPassword?: string;
  };

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: "現在のパスワードと新しいパスワードを入力してください" },
      { status: 400 },
    );
  }
  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: "新しいパスワードは8文字以上で入力してください" },
      { status: 400 },
    );
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
  });
  if (!user) {
    return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
  }
  if (!user.passwordHash) {
    return NextResponse.json(
      { error: "Googleアカウント認証のユーザーはパスワードを変更できません" },
      { status: 400 },
    );
  }

  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) {
    return NextResponse.json(
      { error: "現在のパスワードが正しくありません" },
      { status: 401 },
    );
  }

  const newHash = await hashPassword(newPassword);
  await db
    .update(users)
    .set({ passwordHash: newHash })
    .where(eq(users.id, user.id));

  return NextResponse.json({ success: true });
}
