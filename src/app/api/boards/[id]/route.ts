import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { boards, mediaItems, messages } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { updateBoardSchema } from "@/lib/validators";

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
  if (result.data.config !== undefined) updates.config = JSON.stringify(result.data.config);
  if (result.data.isActive !== undefined) updates.isActive = result.data.isActive;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(existing);
  }

  const [updated] = await db
    .update(boards)
    .set(updates)
    .where(eq(boards.id, id))
    .returning();

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

  return NextResponse.json({ success: true });
}
