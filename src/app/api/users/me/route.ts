// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";

/** PATCH /api/users/me — update current user's mutable preferences */
export async function PATCH(request: NextRequest) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const body = await request.json();
  const { colorTheme } = body as { colorTheme?: string };

  if (colorTheme !== undefined) {
    if (!["system", "light", "dark"].includes(colorTheme)) {
      return NextResponse.json(
        { error: "colorTheme は 'system' / 'light' / 'dark' のいずれかを指定してください" },
        { status: 400 },
      );
    }
    await db
      .update(users)
      .set({ colorTheme })
      .where(eq(users.id, session.userId));
  }

  return NextResponse.json({ ok: true });
}
