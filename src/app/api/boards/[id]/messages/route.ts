// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { messages } from "@/db/schema";
import { eq, and, or, isNull, gt } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { findOwnedBoard, resolveOwnerUserId } from "@/lib/ownership";
import { emitSSE } from "@/lib/sse";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const { id } = await params;

  // Verify board exists
  const board = await findOwnedBoard(id, resolveOwnerUserId(session.user));
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

/** DELETE /api/boards/[id]/messages — delete all messages for a board */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const { id } = await params;

  const board = await findOwnedBoard(id, resolveOwnerUserId(session.user));
  if (!board) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  await db.delete(messages).where(eq(messages.boardId, id));

  emitSSE(id, "message-updated");

  return NextResponse.json({ success: true });
}
