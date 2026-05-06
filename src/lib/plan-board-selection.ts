// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/db";
import { boards, ownerSubscriptions } from "@/db/schema";
import { isBoardActiveForPlan, normalizeBoardStatus } from "@/lib/board-status";
import { getEffectivePlanForOwner } from "@/lib/billing";
import { getPlanDefinition, isPlanCode, type PlanCode } from "@/lib/plans";
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
  currentLimit: number | null;
  selectionPlanCode: PlanCode;
  selectionPlanName: string;
  selectionMode: "current" | "pending";
  pendingPlanEffectiveAt: string | null;
  pendingActiveBoardIds: string[] | null;
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
  const pendingPlanCode =
    effectivePlan.subscription?.pendingPlanCode
    && isPlanCode(effectivePlan.subscription.pendingPlanCode)
      ? effectivePlan.subscription.pendingPlanCode
      : null;
  const selectionPlan = pendingPlanCode
    ? getPlanDefinition(pendingPlanCode)
    : effectivePlan.plan;
  const limit = selectionPlan.limits.boards;

  return {
    limit,
    currentLimit: effectivePlan.plan.limits.boards,
    selectionPlanCode: selectionPlan.code,
    selectionPlanName: selectionPlan.name,
    selectionMode: pendingPlanCode ? "pending" : "current",
    pendingPlanEffectiveAt: effectivePlan.subscription?.pendingPlanEffectiveAt ?? null,
    pendingActiveBoardIds: effectivePlan.subscription?.pendingActiveBoardIds ?? null,
    totalBoards: items.length,
    activeBoards,
    inactiveDueToPlanBoards,
    requiresSelection:
      limit !== null
      && items.length > limit
      && (
        pendingPlanCode
          ? (effectivePlan.subscription?.pendingActiveBoardIds?.length ?? 0) === 0
          : activeBoards > limit
      ),
    canRestore:
      limit !== null
      && inactiveDueToPlanBoards > 0
      && activeBoards < limit,
    boards: items,
  };
}

export async function savePendingPlanBoardSelection(input: {
  ownerUserId: string;
  selectedBoardIds: string[];
}): Promise<PlanBoardSelectionState> {
  const state = await getPlanBoardSelectionState(input.ownerUserId);
  if (state.selectionMode !== "pending" || state.limit === null) {
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

  await db
    .update(ownerSubscriptions)
    .set({
      pendingActiveBoardIds: JSON.stringify(selected),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(ownerSubscriptions.ownerUserId, input.ownerUserId));

  return getPlanBoardSelectionState(input.ownerUserId);
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

export async function applyPendingPlanBoardSelection(input: {
  ownerUserId: string;
  limit: number | null;
  selectedBoardIds: string[] | null;
}) {
  if (input.limit === null) return;

  const ownerBoards = await db
    .select()
    .from(boards)
    .where(eq(boards.ownerUserId, input.ownerUserId))
    .orderBy(desc(boards.updatedAt), desc(boards.createdAt));

  const ownedIds = new Set(ownerBoards.map((board) => board.id));
  const selected = Array.from(new Set(input.selectedBoardIds ?? []))
    .filter((id) => ownedIds.has(id))
    .slice(0, input.limit);
  const fallbackSelected = selected.length > 0
    ? selected
    : ownerBoards.slice(0, input.limit).map((board) => board.id);
  const selectedSet = new Set(fallbackSelected);
  const toActivate = ownerBoards
    .filter((board) => selectedSet.has(board.id) && board.status === "inactive_due_to_plan")
    .map((board) => board.id);
  const toDeactivate = ownerBoards
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
}
