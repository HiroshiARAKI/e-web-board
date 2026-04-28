// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { notFound } from "next/navigation";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { signupRequests } from "@/db/schema";
import SignupPasswordClient from "./SignupPasswordClient";

export const dynamic = "force-dynamic";

export default async function SignupTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const now = new Date().toISOString();

  const signupRequest = await db.query.signupRequests.findFirst({
    where: and(
      eq(signupRequests.token, token),
      isNull(signupRequests.completedAt),
      gt(signupRequests.expiresAt, now),
    ),
  });

  if (!signupRequest) {
    notFound();
  }

  return (
    <SignupPasswordClient
      token={token}
      email={signupRequest.email}
    />
  );
}