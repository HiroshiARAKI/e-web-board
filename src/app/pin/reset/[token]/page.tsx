// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { notFound } from "next/navigation";
import { db } from "@/db";
import { pinResetTokens } from "@/db/schema";
import { eq, and, isNull, gt } from "drizzle-orm";
import PinResetClient from "./PinResetClient";

export const dynamic = "force-dynamic";

export default async function PinResetPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const now = new Date().toISOString();

  const resetToken = await db.query.pinResetTokens.findFirst({
    where: and(
      eq(pinResetTokens.token, token),
      isNull(pinResetTokens.usedAt),
      gt(pinResetTokens.expiresAt, now),
    ),
  });

  if (!resetToken) {
    notFound();
  }

  return <PinResetClient token={token} />;
}
