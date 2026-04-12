// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { mediaItems, boards } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { updateMediaOrderSchema } from "@/lib/validators";
import { emitSSE } from "@/lib/sse";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";

const UPLOAD_DIR = path.resolve(process.cwd(), "public", "uploads");

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
    .select()
    .from(mediaItems)
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

  // Write file to disk
  const buffer = Buffer.from(await file.arrayBuffer());
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
