// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/db";
import { users, authSessions } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import {
  DEFAULT_AUTH_EXPIRE_DAYS,
  AUTH_EXPIRE_DAYS_KEY,
  computeFullAuthExpiry,
  AUTH_SESSION_COOKIE,
  LAST_USER_COOKIE,
} from "@/lib/auth";
import { getOwnerSetting } from "@/lib/owner-settings";
import { resolveOwnerUserId } from "@/lib/ownership";

/** GET /api/auth/pin/status — check if admin user and PIN are configured */
export async function GET() {
  const cookieStore = await cookies();

  // Prefer the logged-in session user; fall back to the remembered user only.
  let targetUser: typeof users.$inferSelect | null | undefined = null;

  const sessionToken = cookieStore.get(AUTH_SESSION_COOKIE)?.value;
  if (sessionToken) {
    const session = await db.query.authSessions.findFirst({
      where: and(
        eq(authSessions.sessionToken, sessionToken),
        gt(authSessions.expiresAt, new Date().toISOString()),
      ),
      with: { user: true },
    });
    targetUser = session?.user ?? null;
  }

  if (!targetUser) {
    const lastUserId = cookieStore.get(LAST_USER_COOKIE)?.value;
    if (lastUserId) {
      targetUser = await db.query.users.findFirst({
        where: eq(users.userId, lastUserId),
      });
    }
  }

  const anyUser = targetUser ? targetUser : await db.query.users.findFirst();

  const ownerUserId = targetUser ? resolveOwnerUserId(targetUser) : null;
  const expireSetting = ownerUserId
    ? await getOwnerSetting(ownerUserId, AUTH_EXPIRE_DAYS_KEY)
    : null;
  const expireDays = expireSetting
    ? parseInt(expireSetting, 10)
    : DEFAULT_AUTH_EXPIRE_DAYS;

  const fullAuthExpiry = targetUser
    ? computeFullAuthExpiry(targetUser.lastFullAuthAt, expireDays)
    : null;

  return NextResponse.json({
    userConfigured: !!anyUser,
    pinConfigured: !!targetUser?.pinHash,
    email: targetUser?.email ?? null,
    userId: targetUser?.userId ?? null,
    fullAuthExpiry: fullAuthExpiry?.toISOString() ?? null,
    authExpireDays: expireDays,
  });
}
