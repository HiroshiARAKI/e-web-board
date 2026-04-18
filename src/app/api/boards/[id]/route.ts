// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { boards, mediaItems, messages } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { updateBoardSchema } from "@/lib/validators";
import { emitSSE } from "@/lib/sse";

const LEGACY_IMAGE_DURATION_SECONDS = 5;

function readSlideInterval(config: unknown): number | undefined {
  if (!config || typeof config !== "object") {
    return undefined;
  }

  const raw = (config as Record<string, unknown>).slideInterval;
  return typeof raw === "number" && Number.isFinite(raw) && raw >= 1 ? raw : undefined;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const board = await db.query.boards.findFirst({
    where: eq(boards.id, id),
  });
  if (!board) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  const media = await db
    .select()
    .from(mediaItems)
    .where(eq(mediaItems.boardId, id))
    .orderBy(asc(mediaItems.displayOrder));

  const boardMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.boardId, id));

  return NextResponse.json({ ...board, mediaItems: media, messages: boardMessages });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const existing = await db.query.boards.findFirst({
    where: eq(boards.id, id),
  });
  if (!existing) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = updateBoardSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.flatten() },
      { status: 400 },
    );
  }

  const updates: Record<string, unknown> = {};
  if (result.data.name !== undefined) updates.name = result.data.name;
  if (result.data.templateId !== undefined) updates.templateId = result.data.templateId;
  if (result.data.config !== undefined) updates.config = result.data.config;
  if (result.data.isActive !== undefined) updates.isActive = result.data.isActive;

  const previousSlideInterval = readSlideInterval(existing.config);
  const nextSlideInterval =
    result.data.config !== undefined
      ? readSlideInterval(result.data.config)
      : undefined;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(existing);
  }

  const [updated] = await db
    .update(boards)
    .set(updates)
    .where(eq(boards.id, id))
    .returning();

  if (
    nextSlideInterval !== undefined &&
    nextSlideInterval !== previousSlideInterval
  ) {
    const boardMedia = await db
      .select({
        id: mediaItems.id,
        type: mediaItems.type,
        duration: mediaItems.duration,
      })
      .from(mediaItems)
      .where(eq(mediaItems.boardId, id));

    const fallbackDurations = new Set<number>([LEGACY_IMAGE_DURATION_SECONDS]);
    if (previousSlideInterval !== undefined) {
      fallbackDurations.add(previousSlideInterval);
    }

    const imageIdsToSync = boardMedia
      .filter(
        (item) => item.type === "image" && fallbackDurations.has(item.duration),
      )
      .map((item) => item.id);

    for (const mediaId of imageIdsToSync) {
      await db
        .update(mediaItems)
        .set({ duration: nextSlideInterval })
        .where(eq(mediaItems.id, mediaId));
    }

    if (imageIdsToSync.length > 0) {
      emitSSE(id, "media-updated");
    }
  }

  emitSSE(id, "board-updated");

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const existing = await db.query.boards.findFirst({
    where: eq(boards.id, id),
  });
  if (!existing) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  await db.delete(boards).where(eq(boards.id, id));

  emitSSE(id, "board-updated");

  return NextResponse.json({ success: true });
}
