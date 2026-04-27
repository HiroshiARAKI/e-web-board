// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { randomUUID } from "crypto";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  accountDeletionRequests,
  boards,
  mediaItems,
  messages,
  settings,
  users,
} from "@/db/schema";
import {
  deleteStoredObject,
  storageKeyFromPublicPath,
  thumbnailStorageKeyFromPublicPath,
} from "@/lib/media-storage";

export const ACCOUNT_DELETION_TOKEN_TTL_MS = 10 * 60 * 1000;

export type AccountDeletionSummary = {
  userCount: number;
  sharedUserCount: number;
  boardCount: number;
  mediaCount: number;
  messageCount: number;
  settingCount: number;
  preferenceCount: number;
};

type OwnerDeletionData = {
  sharedUserIds: string[];
  boardIds: string[];
  mediaFilePaths: string[];
  summary: AccountDeletionSummary;
};

export function generateAccountDeletionToken(): string {
  return randomUUID();
}

export function computeAccountDeletionExpiry(): string {
  return new Date(Date.now() + ACCOUNT_DELETION_TOKEN_TTL_MS).toISOString();
}

async function collectOwnerDeletionData(ownerUserId: string): Promise<OwnerDeletionData> {
  const [sharedUsers, ownedBoards, ownerSettings] = await Promise.all([
    db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.ownerUserId, ownerUserId)),
    db
      .select({ id: boards.id })
      .from(boards)
      .where(eq(boards.ownerUserId, ownerUserId)),
    db
      .select({ key: settings.key })
      .from(settings)
      .where(eq(settings.ownerUserId, ownerUserId)),
  ]);

  const boardIds = ownedBoards.map((board) => board.id);

  const [ownedMedia, ownedMessages] = await Promise.all([
    boardIds.length > 0
      ? db
          .select({ filePath: mediaItems.filePath })
          .from(mediaItems)
          .where(inArray(mediaItems.boardId, boardIds))
      : Promise.resolve([]),
    boardIds.length > 0
      ? db
          .select({ id: messages.id })
          .from(messages)
          .where(inArray(messages.boardId, boardIds))
      : Promise.resolve([]),
  ]);

  return {
    sharedUserIds: sharedUsers.map((user) => user.id),
    boardIds,
    mediaFilePaths: ownedMedia.map((item) => item.filePath),
    summary: {
      userCount: sharedUsers.length + 1,
      sharedUserCount: sharedUsers.length,
      boardCount: boardIds.length,
      mediaCount: ownedMedia.length,
      messageCount: ownedMessages.length,
      settingCount: ownerSettings.length,
      preferenceCount: sharedUsers.length + 1,
    },
  };
}

export async function getOwnerAccountDeletionSummary(
  ownerUserId: string,
): Promise<AccountDeletionSummary> {
  const { summary } = await collectOwnerDeletionData(ownerUserId);
  return summary;
}

export async function deleteOwnerAccount(params: {
  ownerUserId: string;
  deletionRequestId: string;
}) {
  const deletionData = await collectOwnerDeletionData(params.ownerUserId);

  await db.transaction(async (tx) => {
    await tx
      .delete(accountDeletionRequests)
      .where(eq(accountDeletionRequests.id, params.deletionRequestId));

    if (deletionData.sharedUserIds.length > 0) {
      await tx
        .delete(users)
        .where(inArray(users.id, deletionData.sharedUserIds));
    }

    await tx.delete(users).where(eq(users.id, params.ownerUserId));
  });

  for (const filePath of deletionData.mediaFilePaths) {
    try {
      await deleteStoredObject(storageKeyFromPublicPath(filePath));
    } catch (error) {
      console.error("[account-deletion] Failed to delete media file", {
        filePath,
        error,
      });
    }

    try {
      await deleteStoredObject(thumbnailStorageKeyFromPublicPath(filePath));
    } catch (error) {
      console.error("[account-deletion] Failed to delete thumbnail", {
        filePath,
        error,
      });
    }
  }

  return deletionData.summary;
}