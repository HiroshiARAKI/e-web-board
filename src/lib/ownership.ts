// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import type { users } from "@/db/schema";
import { boards } from "@/db/schema";

type UserLike = Pick<typeof users.$inferSelect, "id" | "attribute" | "ownerUserId">;

export function resolveOwnerUserId(user: UserLike): string {
  if (user.attribute === "owner" || !user.ownerUserId) {
    return user.id;
  }
  return user.ownerUserId;
}

export function isOwnerUser(user: UserLike): boolean {
  return user.attribute === "owner" && user.ownerUserId === null;
}

export function isSameOwnerScope(left: UserLike, right: UserLike): boolean {
  return resolveOwnerUserId(left) === resolveOwnerUserId(right);
}

export async function findOwnedBoard(boardId: string, ownerUserId: string) {
  return db.query.boards.findFirst({
    where: and(
      eq(boards.id, boardId),
      eq(boards.ownerUserId, ownerUserId),
    ),
  });
}