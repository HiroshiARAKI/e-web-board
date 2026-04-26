// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { boards, mediaItems, messages } from "@/db/schema";
import { eq, asc, and, or, isNull, gt } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { getTemplate } from "@/lib/templates";
import { normalizeConfig } from "@/lib/utils";
import LiveBoard from "@/components/board/LiveBoard";

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

  if (board.visibility === "private") {
    const session = await getSessionUser();
    if (!session) {
      redirect(`/pin?redirectTo=${encodeURIComponent(`/${boardId}`)}`);
    }
  }

  const normalizedBoard = normalizeConfig(board);

  const template = getTemplate(normalizedBoard.templateId);
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

  return (
    <LiveBoard
      board={normalizedBoard}
      mediaItems={media}
      messages={activeMessages}
      TemplateComponent={template.component}
    />
  );
}
