// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { mediaItems, boards } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
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
import { resolveOwnerUserId } from "@/lib/ownership";
import path from "path";

/**
 * GET /api/media/files — list actual stored media objects.
 *
 * For each file, cross-reference the DB to find which boards reference it.
 */
export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

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
    .innerJoin(boards, eq(mediaItems.boardId, boards.id))
    .where(eq(boards.ownerUserId, resolveOwnerUserId(session.user)));

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

  const result = files
    .filter((file) => fileToBoards.has(path.basename(file.key)))
    .map((file) => {
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
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

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

  const dbPath = publicPathForStorageKey(sanitized);
  const refs = await db
    .select({
      id: mediaItems.id,
      boardId: mediaItems.boardId,
    })
    .from(mediaItems)
    .innerJoin(boards, eq(mediaItems.boardId, boards.id))
    .where(
      and(
        eq(mediaItems.filePath, dbPath),
        eq(boards.ownerUserId, resolveOwnerUserId(session.user)),
      ),
    );

  if (refs.length === 0) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  try {
    await deleteStoredObject(sanitized);
    await deleteStoredObject(thumbnailStorageKeyFromFilename(sanitized));
  } catch {
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 },
    );
  }

  const boardIds = new Set<string>();
  for (const ref of refs) {
    boardIds.add(ref.boardId);
  }

  if (refs.length > 0) {
    await db
      .delete(mediaItems)
      .where(inArray(mediaItems.id, refs.map((ref) => ref.id)));
  }

  for (const boardId of boardIds) {
    emitSSE(boardId, "media-updated");
  }

  return NextResponse.json({
    success: true,
    deletedRecords: refs.length,
  });
}
