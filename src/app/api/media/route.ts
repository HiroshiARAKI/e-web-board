// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { mediaItems, boards, settings } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { updateMediaOrderSchema } from "@/lib/validators";
import { emitSSE } from "@/lib/sse";
import {
  resizeImage,
  generateThumbnail,
  deleteThumbnail,
  DEFAULT_IMAGE_MAX_LONG_EDGE,
} from "@/lib/image";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";

const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm"];
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function GET() {
  const items = await db
    .select({
      id: mediaItems.id,
      boardId: mediaItems.boardId,
      type: mediaItems.type,
      filePath: mediaItems.filePath,
      displayOrder: mediaItems.displayOrder,
      duration: mediaItems.duration,
      createdAt: mediaItems.createdAt,
      updatedAt: mediaItems.updatedAt,
      boardName: boards.name,
    })
    .from(mediaItems)
    .leftJoin(boards, eq(mediaItems.boardId, boards.id))
    .orderBy(asc(mediaItems.displayOrder));
  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid form data" },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  const boardId = formData.get("boardId");
  const duration = formData.get("duration");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }
  if (!boardId || typeof boardId !== "string") {
    return NextResponse.json(
      { error: "boardId is required" },
      { status: 400 },
    );
  }

  // Validate board exists
  const board = await db.query.boards.findFirst({
    where: eq(boards.id, boardId),
  });
  if (!board) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      {
        error: `Unsupported file type: ${file.type}. Allowed: JPEG, PNG, WebP, GIF, MP4, WebM`,
      },
      { status: 400 },
    );
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `File too large. Max size: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
      { status: 400 },
    );
  }

  // Determine media type
  const mediaType = ALLOWED_IMAGE_TYPES.includes(file.type)
    ? "image"
    : "video";

  // Generate unique filename
  const ext = path.extname(file.name) || `.${file.type.split("/")[1]}`;
  const sanitizedExt = ext.replace(/[^a-zA-Z0-9.]/g, "");
  const filename = `${randomUUID()}${sanitizedExt}`;
  const filePath = path.join(UPLOAD_DIR, filename);

  // Ensure upload directory exists
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  // Write file to disk (resize images if needed)
  let buffer: Buffer = Buffer.from(await file.arrayBuffer());

  if (mediaType === "image") {
    // Read the max long edge setting
    const maxSetting = await db.query.settings.findFirst({
      where: eq(settings.key, "imageMaxLongEdge"),
    });
    const maxLongEdge = maxSetting
      ? parseInt(maxSetting.value, 10)
      : DEFAULT_IMAGE_MAX_LONG_EDGE;

    buffer = Buffer.from(await resizeImage(buffer, sanitizedExt, maxLongEdge));

    // Generate thumbnail
    await generateThumbnail(buffer, filename);
  }

  fs.writeFileSync(filePath, buffer);

  // Calculate display order (append at end)
  const existing = await db
    .select()
    .from(mediaItems)
    .where(eq(mediaItems.boardId, boardId));
  const maxOrder = existing.reduce(
    (max, item) => Math.max(max, item.displayOrder),
    -1,
  );

  const durationValue =
    duration && typeof duration === "string"
      ? Math.max(1, parseInt(duration, 10) || 5)
      : 5;

  const [created] = await db
    .insert(mediaItems)
    .values({
      boardId,
      type: mediaType,
      filePath: `/uploads/${filename}`,
      displayOrder: maxOrder + 1,
      duration: durationValue,
    })
    .returning();

  emitSSE(boardId, "media-updated");

  return NextResponse.json(created, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = updateMediaOrderSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.flatten() },
      { status: 400 },
    );
  }

  const updates = result.data;
  const updated: unknown[] = [];

  const boardIds = new Set<string>();
  for (const item of updates) {
    const [row] = await db
      .update(mediaItems)
      .set({ displayOrder: item.displayOrder })
      .where(eq(mediaItems.id, item.id))
      .returning();
    if (row) {
      updated.push(row);
      boardIds.add((row as { boardId: string }).boardId);
    }
  }

  for (const boardId of boardIds) {
    emitSSE(boardId, "media-updated");
  }

  return NextResponse.json(updated);
}

export async function DELETE() {
  // Delete all media items and their files on disk
  const items = await db.select().from(mediaItems);

  const boardIds = new Set<string>();
  const deletedFiles = new Set<string>();
  for (const item of items) {
    boardIds.add(item.boardId);
    const basename = path.basename(item.filePath);
    const filePath = path.join(UPLOAD_DIR, basename);
    deletedFiles.add(basename);
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch {
      // continue even if file deletion fails
    }
    deleteThumbnail(basename);
  }

  await db.delete(mediaItems);

  // Also delete any orphan files on disk that have no DB record
  if (fs.existsSync(UPLOAD_DIR)) {
    const remaining = fs.readdirSync(UPLOAD_DIR);
    for (const name of remaining) {
      if (name.startsWith(".") || name === "thumbs") continue;
      if (deletedFiles.has(name)) continue;
      try {
        fs.unlinkSync(path.join(UPLOAD_DIR, name));
      } catch {
        // ignore
      }
      deleteThumbnail(name);
    }
  }

  // Clean up thumbs directory entirely
  const thumbDir = path.join(UPLOAD_DIR, "thumbs");
  try {
    if (fs.existsSync(thumbDir)) {
      fs.rmSync(thumbDir, { recursive: true });
    }
  } catch {
    // ignore
  }

  for (const boardId of boardIds) {
    emitSSE(boardId, "media-updated");
  }

  return NextResponse.json({ success: true, deleted: items.length });
}
