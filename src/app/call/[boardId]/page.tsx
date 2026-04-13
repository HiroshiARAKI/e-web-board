// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { notFound } from "next/navigation";
import { db } from "@/db";
import { boards, messages } from "@/db/schema";
import { eq, and, or, isNull, gt } from "drizzle-orm";
import CallScreenClient from "./CallScreenClient";
import PasscodeForm from "./PasscodeForm";

export const dynamic = "force-dynamic";

export default async function CallPage({
  params,
  searchParams,
}: {
  params: Promise<{ boardId: string }>;
  searchParams: Promise<{ passcode?: string }>;
}) {
  const { boardId } = await params;
  const { passcode } = await searchParams;

  const board = await db.query.boards.findFirst({
    where: eq(boards.id, boardId),
  });

  if (!board || !board.isActive) {
    notFound();
  }

  // Verify template is call-number
  if (board.templateId !== "call-number") {
    notFound();
  }

  const config = (board.config && typeof board.config === "object"
    ? board.config
    : {}) as Record<string, unknown>;
  const storedPasscode = (config.passcode as string) ?? "";

  // Validate passcode
  if (!storedPasscode || passcode !== storedPasscode) {
    return <PasscodeForm boardId={boardId} error={passcode ? "パスコードが正しくありません" : undefined} />;
  }

  // Fetch active messages (queue numbers)
  const now = new Date().toISOString();
  const activeMessages = await db
    .select()
    .from(messages)
    .where(
      and(
        eq(messages.boardId, boardId),
        or(isNull(messages.expiresAt), gt(messages.expiresAt, now)),
      ),
    );

  return (
    <CallScreenClient
      boardId={boardId}
      initialMessages={activeMessages}
    />
  );
}
