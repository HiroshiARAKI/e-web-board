// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { mediaItems, boards } from "@/db/schema";
import { eq } from "drizzle-orm";
import { emitSSE } from "@/lib/sse";
import {
  deleteStoredObject,
  isMediaStorageKey,
  isThumbnailStorageKey,
  listStoredObjects,
  mediaTypeFromStorageKey,
  publicPathForStorageKey,
  thumbnailStorageKeyFromFilename,
} from "@/lib/media-storage";
import path from "path";

/**
 * GET /api/media/files — list actual stored media objects.
 *
 * For each file, cross-reference the DB to find which boards reference it.
 */
export async function GET() {
  const storedObjects = await listStoredObjects();
  const files = storedObjects.filter((object) => isMediaStorageKey(object.key));
  const thumbnails = new Set(
    storedObjects
      .filter((object) => isThumbnailStorageKey(object.key))
      .map((object) => object.key),
  );

  // Fetch all media items with board info to cross-reference
  const dbItems = await db
    .select({
      id: mediaItems.id,
      filePath: mediaItems.filePath,
      boardId: mediaItems.boardId,
      boardName: boards.name,
    })
    .from(mediaItems)
    .leftJoin(boards, eq(mediaItems.boardId, boards.id));

  // Build a map: filename -> board references
  const fileToBoards = new Map<
    string,
    { boardId: string; boardName: string | null }[]
  >();
  for (const item of dbItems) {
    const basename = path.basename(item.filePath);
    const existing = fileToBoards.get(basename) ?? [];
    existing.push({ boardId: item.boardId, boardName: item.boardName });
    fileToBoards.set(basename, existing);
  }

  const result = files.map((file) => {
    const filename = path.basename(file.key);
    const type = mediaTypeFromStorageKey(file.key) ?? "image";
    const thumbKey = thumbnailStorageKeyFromFilename(filename);
    const thumbPath = thumbnails.has(thumbKey)
      ? publicPathForStorageKey(thumbKey)
      : null;

    return {
      filename,
      filePath: publicPathForStorageKey(file.key),
      thumbPath,
      type,
      size: file.size,
      modifiedAt: file.modifiedAt,
      boards: fileToBoards.get(filename) ?? [],
    };
  });

  return NextResponse.json(result);
}

/**
 * DELETE /api/media/files — delete a stored file and remove DB references.
 *
 * Body: { filename: string }
 */
export async function DELETE(request: NextRequest) {
  let body: { filename?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { filename } = body;
  if (!filename || typeof filename !== "string") {
    return NextResponse.json(
      { error: "filename is required" },
      { status: 400 },
    );
  }

  const sanitized = path.basename(filename);

  try {
    await deleteStoredObject(sanitized);
    await deleteStoredObject(thumbnailStorageKeyFromFilename(sanitized));
  } catch {
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 },
    );
  }

  // Delete all DB records that reference this file and notify boards
  const dbPath = publicPathForStorageKey(sanitized);
  const refs = await db
    .select()
    .from(mediaItems)
    .where(eq(mediaItems.filePath, dbPath));

  const boardIds = new Set<string>();
  for (const ref of refs) {
    boardIds.add(ref.boardId);
  }

  if (refs.length > 0) {
    await db.delete(mediaItems).where(eq(mediaItems.filePath, dbPath));
  }

  for (const boardId of boardIds) {
    emitSSE(boardId, "media-updated");
  }

  return NextResponse.json({
    success: true,
    deletedRecords: refs.length,
  });
}
