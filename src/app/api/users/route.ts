// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { hashPassword } from "@/lib/auth";
import { randomUUID } from "crypto";
import { resolveOwnerUserId } from "@/lib/ownership";

/** GET /api/users — list all users (admin only) */
export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
  }

  const allUsers = await db
    .select({
      id: users.id,
      userId: users.userId,
      email: users.email,
      attribute: users.attribute,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.ownerUserId, resolveOwnerUserId(session.user)))
    .orderBy(users.createdAt);

  const ownerUserId = resolveOwnerUserId(session.user);
  const ownerUser = await db.query.users.findFirst({ where: eq(users.id, ownerUserId) });
  const scopedUsers = ownerUser ? [
    {
      id: ownerUser.id,
      userId: ownerUser.userId,
      email: ownerUser.email,
      attribute: ownerUser.attribute,
      role: ownerUser.role,
      createdAt: ownerUser.createdAt,
    },
    ...allUsers.filter((user) => user.id !== ownerUser.id),
  ] : allUsers;

  return NextResponse.json(scopedUsers);
}

/** POST /api/users — create a new user (admin only) */
export async function POST(request: NextRequest) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
  }

  const body = await request.json();
  const { userId, email, password, role } = body as {
    userId?: string;
    email?: string;
    password?: string;
    role?: string;
  };

  if (!userId || !email || !password) {
    return NextResponse.json(
      { error: "ユーザーID・メールアドレス・パスワードは必須です" },
      { status: 400 },
    );
  }
  if (!/^[a-zA-Z0-9_\-]{3,32}$/.test(userId)) {
    return NextResponse.json(
      { error: "ユーザーIDは3〜32文字の英数字・_・-のみ使用できます" },
      { status: 400 },
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "パスワードは8文字以上で入力してください" },
      { status: 400 },
    );
  }
  const normalizedRole = role === "admin" ? "admin" : "general";

  // Check uniqueness
  const existing = await db.query.users.findFirst({
    where: eq(users.userId, userId),
  });
  if (existing) {
    return NextResponse.json(
      { error: "このユーザーIDはすでに使用されています" },
      { status: 409 },
    );
  }
  const existingEmail = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  if (existingEmail) {
    return NextResponse.json(
      { error: "このメールアドレスはすでに使用されています" },
      { status: 409 },
    );
  }

  const passwordHash = await hashPassword(password);
  const id = randomUUID();

  await db.insert(users).values({
    id,
    userId,
    email,
    passwordHash,
    attribute: "shared",
    ownerUserId: resolveOwnerUserId(session.user),
    role: normalizedRole,
  });

  return NextResponse.json({
    id,
    userId,
    email,
    attribute: "shared",
    role: normalizedRole,
  }, { status: 201 });
}
