// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSessionUser } from "@/lib/auth";
import {
  applyPlanBoardSelection,
  getPlanBoardSelectionState,
  savePendingPlanBoardSelection,
} from "@/lib/plan-board-selection";
import { resolveOwnerUserId } from "@/lib/ownership";

const boardActivationSchema = z.object({
  selectedBoardIds: z.array(z.string().uuid()),
});

function errorResponse(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "board_selection_limit_exceeded") {
      return NextResponse.json(
        { error: error.message, code: error.message },
        { status: 400 },
      );
    }
    if (error.message === "board_selection_invalid_board") {
      return NextResponse.json(
        { error: error.message, code: error.message },
        { status: 404 },
      );
    }
  }

  throw error;
}

export async function GET() {
  const session = await getAdminSessionUser();
  if (!session) {
    return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
  }

  const ownerUserId = resolveOwnerUserId(session.user);
  return NextResponse.json(await getPlanBoardSelectionState(ownerUserId));
}

export async function POST(request: NextRequest) {
  const session = await getAdminSessionUser();
  if (!session) {
    return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = boardActivationSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const ownerUserId = resolveOwnerUserId(session.user);
    const currentState = await getPlanBoardSelectionState(ownerUserId);
    const state = await (
      currentState.selectionMode === "pending"
        ? savePendingPlanBoardSelection
        : applyPlanBoardSelection
    )({
      ownerUserId,
      selectedBoardIds: result.data.selectedBoardIds,
    });
    return NextResponse.json(state);
  } catch (error) {
    return errorResponse(error);
  }
}
