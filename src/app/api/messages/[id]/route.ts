import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { messages } from "@/db/schema";
import { eq } from "drizzle-orm";

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

  return NextResponse.json({ success: true });
}
