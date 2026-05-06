// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/db";
import { boards } from "@/db/schema";
import { isBoardActiveForPlan, normalizeBoardStatus } from "@/lib/board-status";
import { getEffectivePlanForOwner } from "@/lib/billing";
import { emitSSE } from "@/lib/sse";
import type { BoardStatus } from "@/lib/board-status";

export interface PlanBoardSelectionItem {
  id: string;
  name: string;
  status: BoardStatus;
  isActive: boolean;
  visibility: string;
  templateId: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlanBoardSelectionState {
  limit: number | null;
  totalBoards: number;
  activeBoards: number;
  inactiveDueToPlanBoards: number;
  requiresSelection: boolean;
  canRestore: boolean;
  boards: PlanBoardSelectionItem[];
}

function toSelectionItem(
  board: typeof boards.$inferSelect,
): PlanBoardSelectionItem {
  return {
    id: board.id,
    name: board.name,
    status: normalizeBoardStatus(board.status),
    isActive: board.isActive,
    visibility: board.visibility,
    templateId: board.templateId,
    createdAt: board.createdAt,
    updatedAt: board.updatedAt,
  };
}

export async function getPlanBoardSelectionState(
  ownerUserId: string,
): Promise<PlanBoardSelectionState> {
  const [effectivePlan, ownerBoards] = await Promise.all([
    getEffectivePlanForOwner(ownerUserId),
    db
      .select()
      .from(boards)
      .where(eq(boards.ownerUserId, ownerUserId))
      .orderBy(desc(boards.updatedAt), desc(boards.createdAt)),
  ]);
  const items = ownerBoards.map(toSelectionItem);
  const activeBoards = items.filter(isBoardActiveForPlan).length;
  const inactiveDueToPlanBoards = items.filter(
    (board) => board.status === "inactive_due_to_plan",
  ).length;
  const limit = effectivePlan.plan.limits.boards;

  return {
    limit,
    totalBoards: items.length,
    activeBoards,
    inactiveDueToPlanBoards,
    requiresSelection: limit !== null && activeBoards > limit,
    canRestore:
      limit !== null
      && inactiveDueToPlanBoards > 0
      && activeBoards < limit,
    boards: items,
  };
}

export async function applyPlanBoardSelection(input: {
  ownerUserId: string;
  selectedBoardIds: string[];
}): Promise<PlanBoardSelectionState> {
  const state = await getPlanBoardSelectionState(input.ownerUserId);
  if (state.limit === null) {
    return state;
  }

  const selected = Array.from(new Set(input.selectedBoardIds));
  if (selected.length > state.limit) {
    throw new Error("board_selection_limit_exceeded");
  }

  const ownedIds = new Set(state.boards.map((board) => board.id));
  if (selected.some((id) => !ownedIds.has(id))) {
    throw new Error("board_selection_invalid_board");
  }

  const selectedSet = new Set(selected);
  const toActivate = state.boards
    .filter((board) => selectedSet.has(board.id) && board.status === "inactive_due_to_plan")
    .map((board) => board.id);
  const toDeactivate = state.boards
    .filter((board) => !selectedSet.has(board.id) && board.status === "active")
    .map((board) => board.id);

  if (toActivate.length > 0) {
    await db
      .update(boards)
      .set({
        status: "active",
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(boards.ownerUserId, input.ownerUserId),
          inArray(boards.id, toActivate),
          ne(boards.status, "deleted"),
        ),
      );
  }

  if (toDeactivate.length > 0) {
    await db
      .update(boards)
      .set({
        status: "inactive_due_to_plan",
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(boards.ownerUserId, input.ownerUserId),
          inArray(boards.id, toDeactivate),
        ),
      );
  }

  for (const boardId of [...toActivate, ...toDeactivate]) {
    emitSSE(boardId, "board-updated");
  }

  return getPlanBoardSelectionState(input.ownerUserId);
}
