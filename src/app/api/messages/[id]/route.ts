// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { messages } from "@/db/schema";
import { eq } from "drizzle-orm";
import { emitSSE } from "@/lib/sse";
import { updateMessageSchema } from "@/lib/validators";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const existing = await db.query.messages.findFirst({
    where: eq(messages.id, id),
  });
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
  const { id } = await params;

  const existing = await db.query.messages.findFirst({
    where: eq(messages.id, id),
  });
  if (!existing) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  await db.delete(messages).where(eq(messages.id, id));

  emitSSE(existing.boardId, "message-updated");

  return NextResponse.json({ success: true });
}
