// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { db } from "@/db";
import { users, authSessions, settings } from "@/db/schema";
import { eq, and, gt, isNotNull } from "drizzle-orm";
import {
  AUTH_SESSION_COOKIE,
  DEFAULT_AUTH_EXPIRE_DAYS,
  AUTH_EXPIRE_DAYS_KEY,
  isFullAuthValid,
  LAST_USER_COOKIE,
} from "@/lib/auth";
import PinLoginClient from "./PinLoginClient";

export const dynamic = "force-dynamic";

export default async function PinLoginPage() {
  const cookieStore = await cookies();
  const lastUserId = cookieStore.get(LAST_USER_COOKIE)?.value;

  // Step 1: Try the last-logged-in user from cookie
  let targetUser = lastUserId
    ? await db.query.users.findFirst({ where: eq(users.userId, lastUserId) })
    : null;

  // Step 2: If that user has no PIN, fall back to the first user who has one
  if (!targetUser?.pinHash) {
    const userWithPin = await db.query.users.findFirst({
      where: isNotNull(users.pinHash),
    });
    if (userWithPin) targetUser = userWithPin;
  }

  // Step 3: Ultimate fallback — any user at all
  if (!targetUser) {
    targetUser = await db.query.users.findFirst();
  }

  if (!targetUser) {
    redirect("/pin/setup");
  }

  // If no user in the system has a PIN, go to credential login
  if (!targetUser.pinHash) {
    redirect("/pin/login");
  }

  // If already authenticated, redirect to dashboard
  const sessionCookie = cookieStore.get(AUTH_SESSION_COOKIE)?.value;
  if (sessionCookie) {
    const sessionRow = await db.query.authSessions.findFirst({
      where: and(
        eq(authSessions.sessionToken, sessionCookie),
        gt(authSessions.expiresAt, new Date().toISOString()),
      ),
    });
    if (sessionRow) {
      redirect("/boards");
    }
  }

  // Check if full auth (email+password) is required for the target user
  const expireSetting = await db.query.settings.findFirst({
    where: eq(settings.key, AUTH_EXPIRE_DAYS_KEY),
  });
  const expireDays = expireSetting?.value
    ? parseInt(expireSetting.value, 10)
    : DEFAULT_AUTH_EXPIRE_DAYS;

  if (!isFullAuthValid(targetUser.lastFullAuthAt, expireDays)) {
    redirect("/pin/login");
  }

  return <PinLoginClient userId={targetUser.userId} />;
}
