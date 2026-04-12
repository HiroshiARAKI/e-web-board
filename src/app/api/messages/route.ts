// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { boards, messages } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createMessageSchema } from "@/lib/validators";
import { emitSSE } from "@/lib/sse";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = createMessageSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.flatten() },
      { status: 400 },
    );
  }

  const { boardId, content, priority, expiresAt } = result.data;

  // Verify board exists
  const board = await db.query.boards.findFirst({
    where: eq(boards.id, boardId),
  });
  if (!board) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  const [inserted] = await db
    .insert(messages)
    .values({
      boardId,
      content,
      priority,
      expiresAt: expiresAt ?? null,
    })
    .returning();

  emitSSE(boardId, "message-updated");

  return NextResponse.json(inserted, { status: 201 });
}
