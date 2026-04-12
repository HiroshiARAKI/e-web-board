// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { mediaItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { emitSSE } from "@/lib/sse";
import path from "path";
import fs from "fs";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const item = await db.query.mediaItems.findFirst({
    where: eq(mediaItems.id, id),
  });
  if (!item) {
    return NextResponse.json(
      { error: "Media item not found" },
      { status: 404 },
    );
  }

  // Delete file from disk
  // item.filePath is stored as "/uploads/filename" — strip leading slash to
  // avoid path.resolve treating it as an absolute path.
  const filePath = path.join(
    process.cwd(),
    "public",
    item.filePath.replace(/^\//, ""),
  );
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    // File may already be deleted; continue with DB cleanup
  }

  // Delete from DB
  await db.delete(mediaItems).where(eq(mediaItems.id, id));

  emitSSE(item.boardId, "media-updated");

  return NextResponse.json({ success: true });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const item = await db.query.mediaItems.findFirst({
    where: eq(mediaItems.id, id),
  });
  if (!item) {
    return NextResponse.json(
      { error: "Media item not found" },
      { status: 404 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (
    typeof body === "object" &&
    body !== null &&
    "duration" in body &&
    typeof (body as Record<string, unknown>).duration === "number"
  ) {
    updates.duration = (body as Record<string, unknown>).duration;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(item);
  }

  const [updated] = await db
    .update(mediaItems)
    .set(updates)
    .where(eq(mediaItems.id, id))
    .returning();

  emitSSE(item.boardId, "media-updated");

  return NextResponse.json(updated);
}
