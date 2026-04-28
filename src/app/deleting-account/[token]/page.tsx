// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { notFound } from "next/navigation";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { accountDeletionRequests } from "@/db/schema";
import DeletingAccountClient from "./DeletingAccountClient";

export const dynamic = "force-dynamic";

export default async function DeletingAccountPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const now = new Date().toISOString();

  const deletionRequest = await db.query.accountDeletionRequests.findFirst({
    where: and(
      eq(accountDeletionRequests.token, token),
      isNull(accountDeletionRequests.completedAt),
      gt(accountDeletionRequests.expiresAt, now),
    ),
  });

  if (!deletionRequest) {
    notFound();
  }

  return <DeletingAccountClient token={token} />;
}