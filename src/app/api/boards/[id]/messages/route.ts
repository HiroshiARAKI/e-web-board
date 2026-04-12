// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { boards, messages } from "@/db/schema";
import { eq, and, or, isNull, gt } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Verify board exists
  const board = await db.query.boards.findFirst({
    where: eq(boards.id, id),
  });
  if (!board) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  const now = new Date().toISOString();
  const activeMessages = await db
    .select()
    .from(messages)
    .where(
      and(
        eq(messages.boardId, id),
        or(isNull(messages.expiresAt), gt(messages.expiresAt, now)),
      ),
    );

  return NextResponse.json(activeMessages);
}
