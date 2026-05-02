// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { boards, mediaItems } from "@/db/schema";
import { getEffectivePlanForOwner } from "@/lib/billing";
import type { MessageKey } from "@/lib/i18n";
import {
  listStoredObjects,
  publicPathForStorageKey,
  thumbnailStorageKeyFromPublicPath,
} from "@/lib/media-storage";
import { PLAN_LIMIT_MESSAGE_KEYS, type PlanLimitCode } from "@/lib/plan-limit";
import type { PlanCode, PlanDefinition } from "@/lib/plans";

export interface OwnerPlanUsage {
  boards: number;
  images: number;
  videos: number;
  storageBytes: number;
}

export class PlanLimitError extends Error {
  constructor(
    readonly code: PlanLimitCode,
    readonly messageKey: MessageKey,
    readonly details: {
      planCode: PlanCode;
      limit: number | boolean | null;
      usage?: number;
    },
  ) {
    super(code);
  }
}

function readUploadMaxBytes(): number | null {
  const raw = process.env.UPLOAD_MAX_BYTES?.trim();
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.floor(parsed);
}

function uploadMaxBytesForPlan(plan: PlanDefinition): number | null {
  return plan.limits.maxUploadBytes ?? readUploadMaxBytes();
}

function throwLimit(
  code: PlanLimitCode,
  plan: PlanDefinition,
  limit: number | boolean | null,
  usage?: number,
): never {
  throw new PlanLimitError(code, PLAN_LIMIT_MESSAGE_KEYS[code], {
    planCode: plan.code,
    limit,
    usage,
  });
}

export function isPlanLimitError(error: unknown): error is PlanLimitError {
  return error instanceof PlanLimitError;
}

export function planLimitErrorBody(error: PlanLimitError) {
  return {
    error: error.code,
    code: error.code,
    messageKey: error.messageKey,
    planCode: error.details.planCode,
    limit: error.details.limit,
    usage: error.details.usage,
    upgradeRequired: true,
  };
}

export async function getOwnerPlanUsage(ownerUserId: string): Promise<OwnerPlanUsage> {
  const boardCount = await getOwnerBoardCount(ownerUserId);
  const ownerMedia = await db
    .select({
      type: mediaItems.type,
      filePath: mediaItems.filePath,
    })
    .from(mediaItems)
    .innerJoin(boards, eq(mediaItems.boardId, boards.id))
    .where(eq(boards.ownerUserId, ownerUserId));

  const storedObjects = await listStoredObjects();
  const sizeByPublicPath = new Map<string, number>();
  for (const object of storedObjects) {
    sizeByPublicPath.set(publicPathForStorageKey(object.key), object.size);
  }

  const storageBytes = ownerMedia.reduce((total, item) => {
    const mediaSize = sizeByPublicPath.get(item.filePath) ?? 0;
    const thumbnailPath = publicPathForStorageKey(thumbnailStorageKeyFromPublicPath(item.filePath));
    const thumbnailSize = sizeByPublicPath.get(thumbnailPath) ?? 0;
    return total + mediaSize + thumbnailSize;
  }, 0);

  return {
    boards: boardCount,
    images: ownerMedia.filter((item) => item.type === "image").length,
    videos: ownerMedia.filter((item) => item.type === "video").length,
    storageBytes,
  };
}

export async function getOwnerBoardCount(ownerUserId: string): Promise<number> {
  const ownerBoards = await db
    .select({ id: boards.id })
    .from(boards)
    .where(eq(boards.ownerUserId, ownerUserId));
  return ownerBoards.length;
}

export async function assertCanCreateBoard(ownerUserId: string) {
  const effectivePlan = await getEffectivePlanForOwner(ownerUserId);
  const limit = effectivePlan.plan.limits.boards;
  if (limit === null) return effectivePlan;

  const boardCount = await getOwnerBoardCount(ownerUserId);
  if (boardCount >= limit) {
    throwLimit("plan_limit_board_count", effectivePlan.plan, limit, boardCount);
  }

  return effectivePlan;
}

export async function assertCanUploadMedia(input: {
  ownerUserId: string;
  mediaType: "image" | "video";
  fileSize: number;
  additionalStorageBytes?: number;
}) {
  const effectivePlan = await getEffectivePlanForOwner(input.ownerUserId);
  const { plan } = effectivePlan;
  const uploadLimit = uploadMaxBytesForPlan(plan);
  if (uploadLimit !== null && input.fileSize > uploadLimit) {
    throwLimit("plan_limit_upload_size", plan, uploadLimit, input.fileSize);
  }

  if (input.mediaType === "video" && !plan.limits.videoEnabled) {
    throwLimit("plan_limit_video_disabled", plan, false);
  }

  const needsUsage =
    plan.limits.images !== null
    || (plan.limits.storageBytes !== null && input.additionalStorageBytes !== undefined);
  if (!needsUsage) return effectivePlan;

  const usage = await getOwnerPlanUsage(input.ownerUserId);
  if (
    input.mediaType === "image"
    && plan.limits.images !== null
    && usage.images >= plan.limits.images
  ) {
    throwLimit("plan_limit_image_count", plan, plan.limits.images, usage.images);
  }

  if (
    plan.limits.storageBytes !== null
    && input.additionalStorageBytes !== undefined
    && usage.storageBytes + input.additionalStorageBytes > plan.limits.storageBytes
  ) {
    throwLimit(
      "plan_limit_storage",
      plan,
      plan.limits.storageBytes,
      usage.storageBytes + input.additionalStorageBytes,
    );
  }

  return effectivePlan;
}

export async function getEffectiveImageMaxLongEdge(
  ownerUserId: string,
  ownerSettingMaxLongEdge: number,
) {
  const { plan } = await getEffectivePlanForOwner(ownerUserId);
  const planMax = plan.limits.maxResolution;
  if (planMax === null) return ownerSettingMaxLongEdge;
  if (ownerSettingMaxLongEdge <= 0) return planMax;
  return Math.min(ownerSettingMaxLongEdge, planMax);
}

export async function assertCanSetImageMaxLongEdge(input: {
  ownerUserId: string;
  maxLongEdge: number;
}) {
  const { plan } = await getEffectivePlanForOwner(input.ownerUserId);
  const limit = plan.limits.maxResolution;
  if (limit === null) return;
  if (input.maxLongEdge <= 0 || input.maxLongEdge > limit) {
    throwLimit("plan_limit_resolution", plan, limit, input.maxLongEdge);
  }
}

export async function assertImageResolutionAllowed(input: {
  ownerUserId: string;
  longEdge: number;
}) {
  const { plan } = await getEffectivePlanForOwner(input.ownerUserId);
  const limit = plan.limits.maxResolution;
  if (limit !== null && input.longEdge > limit) {
    throwLimit("plan_limit_resolution", plan, limit, input.longEdge);
  }
}
