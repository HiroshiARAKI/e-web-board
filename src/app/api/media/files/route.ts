// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { mediaItems, boards } from "@/db/schema";
import { eq } from "drizzle-orm";
import { emitSSE } from "@/lib/sse";
import path from "path";
import fs from "fs";

const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const VIDEO_EXTS = new Set([".mp4", ".webm"]);
const MEDIA_EXTS = new Set([...IMAGE_EXTS, ...VIDEO_EXTS]);

/**
 * GET /api/media/files — list actual files on disk under uploads/.
 *
 * For each file, cross-reference the DB to find which boards reference it.
 */
export async function GET() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    return NextResponse.json([]);
  }

  const entries = fs.readdirSync(UPLOAD_DIR);
  const files = entries.filter((name) => {
    if (name.startsWith(".")) return false;
    const ext = path.extname(name).toLowerCase();
    return MEDIA_EXTS.has(ext);
  });

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

  const result = files.map((filename) => {
    const ext = path.extname(filename).toLowerCase();
    const stat = fs.statSync(path.join(UPLOAD_DIR, filename));
    return {
      filename,
      filePath: `/uploads/${filename}`,
      type: IMAGE_EXTS.has(ext) ? "image" : "video",
      size: stat.size,
      modifiedAt: stat.mtime.toISOString(),
      boards: fileToBoards.get(filename) ?? [],
    };
  });

  return NextResponse.json(result);
}

/**
 * DELETE /api/media/files — delete a file from disk and remove DB references.
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

  // Prevent directory traversal
  const sanitized = path.basename(filename);
  const resolved = path.resolve(UPLOAD_DIR, sanitized);
  if (!resolved.startsWith(UPLOAD_DIR)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Delete file from disk
  try {
    if (fs.existsSync(resolved)) {
      fs.unlinkSync(resolved);
    }
  } catch {
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 },
    );
  }

  // Delete all DB records that reference this file and notify boards
  const dbPath = `/uploads/${sanitized}`;
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
