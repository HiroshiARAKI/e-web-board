// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { boards, messages } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { emitSSE } from "@/lib/sse";
import { resolveOwnerUserId } from "@/lib/ownership";
import { updateMessageSchema } from "@/lib/validators";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = updateMessageSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.flatten() },
      { status: 400 },
    );
  }

  const [existing] = await db
    .select({
      id: messages.id,
      boardId: messages.boardId,
      ownerUserId: boards.ownerUserId,
    })
    .from(messages)
    .innerJoin(boards, eq(messages.boardId, boards.id))
    .where(and(eq(messages.id, id), eq(boards.ownerUserId, resolveOwnerUserId(session.user))));
  if (!existing) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  const [updated] = await db
    .update(messages)
    .set(result.data)
    .where(eq(messages.id, id))
    .returning();

  emitSSE(existing.boardId, "message-updated");

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const { id } = await params;

  const [existing] = await db
    .select({
      id: messages.id,
      boardId: messages.boardId,
      ownerUserId: boards.ownerUserId,
    })
    .from(messages)
    .innerJoin(boards, eq(messages.boardId, boards.id))
    .where(and(eq(messages.id, id), eq(boards.ownerUserId, resolveOwnerUserId(session.user))));
  if (!existing) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  await db.delete(messages).where(eq(messages.id, id));

  emitSSE(existing.boardId, "message-updated");

  return NextResponse.json({ success: true });
}
