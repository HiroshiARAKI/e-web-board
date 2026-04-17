// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, ne, and } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";

/** PATCH /api/users/[id] — update user role (admin only) */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { role } = body as { role?: string };

  if (role !== "admin" && role !== "general") {
    return NextResponse.json(
      { error: "role は 'admin' または 'general' を指定してください" },
      { status: 400 },
    );
  }

  const target = await db.query.users.findFirst({ where: eq(users.id, id) });
  if (!target) {
    return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
  }

  // Prevent removing the last admin
  if (target.role === "admin" && role === "general") {
    const otherAdmins = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.role, "admin"), ne(users.id, id)));
    if (otherAdmins.length === 0) {
      return NextResponse.json(
        { error: "管理者ユーザーは最低1人必要です" },
        { status: 400 },
      );
    }
  }

  await db.update(users).set({ role }).where(eq(users.id, id));
  return NextResponse.json({ ok: true });
}

/** DELETE /api/users/[id] — delete user (admin only, cannot delete last admin) */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
  }

  const { id } = await params;

  const target = await db.query.users.findFirst({ where: eq(users.id, id) });
  if (!target) {
    return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
  }

  // Prevent deleting the last admin
  if (target.role === "admin") {
    const otherAdmins = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.role, "admin"), ne(users.id, id)));
    if (otherAdmins.length === 0) {
      return NextResponse.json(
        { error: "管理者ユーザーは最低1人必要です。削除できません。" },
        { status: 400 },
      );
    }
  }

  await db.delete(users).where(eq(users.id, id));
  return NextResponse.json({ ok: true });
}
