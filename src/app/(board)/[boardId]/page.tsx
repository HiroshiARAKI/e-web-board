import { notFound } from "next/navigation";
import { db } from "@/db";
import { boards, mediaItems, messages } from "@/db/schema";
import { eq, asc, and, or, isNull, gt } from "drizzle-orm";
import { getTemplate } from "@/lib/templates";

export const dynamic = "force-dynamic";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const { boardId } = await params;

  const board = await db.query.boards.findFirst({
    where: eq(boards.id, boardId),
  });

  if (!board || !board.isActive) {
    notFound();
  }

  const template = getTemplate(board.templateId);
  if (!template) {
    notFound();
  }

  const media = await db
    .select()
    .from(mediaItems)
    .where(eq(mediaItems.boardId, boardId))
    .orderBy(asc(mediaItems.displayOrder));

  const now = new Date().toISOString();
  const activeMessages = await db
    .select()
    .from(messages)
    .where(
      and(
        eq(messages.boardId, boardId),
        or(isNull(messages.expiresAt), gt(messages.expiresAt, now))
      )
    );

  const TemplateComponent = template.component;

  return (
    <TemplateComponent board={board} mediaItems={media} messages={activeMessages} />
  );
}
