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
  const sessionCookie = cookieStore.get(AUTH_SESSION_COOKIE)?.value;

  console.log("[/pin] START", { lastUserId, hasSessionCookie: !!sessionCookie });

  // ── 1. Already authenticated? → dashboard ─────────────────────────
  if (sessionCookie) {
    const sessionRow = await db.query.authSessions.findFirst({
      where: and(
        eq(authSessions.sessionToken, sessionCookie),
        gt(authSessions.expiresAt, new Date().toISOString()),
      ),
    });
    if (sessionRow) {
      console.log("[/pin] Valid session found → /boards");
      redirect("/boards");
    }
    console.log("[/pin] Session cookie present but invalid/expired");
  }

  // ── 2. Resolve target user ─────────────────────────────────────────
  let targetUser = lastUserId
    ? await db.query.users.findFirst({ where: eq(users.userId, lastUserId) })
    : null;

  console.log("[/pin] Cookie user lookup", {
    lastUserId,
    found: !!targetUser,
    hasPIN: !!targetUser?.pinHash,
    userId: targetUser?.userId ?? null,
  });

  if (targetUser) {
    // Cookie user found. If they have no PIN they must use credentials login.
    if (!targetUser.pinHash) {
      console.log("[/pin] Cookie user has no PIN → /pin/login");
      redirect("/pin/login");
    }
  } else {
    // No cookie or cookie user not found — find first user with a PIN
    targetUser = await db.query.users.findFirst({ where: isNotNull(users.pinHash) });
    console.log("[/pin] Fallback user with PIN", {
      found: !!targetUser,
      userId: targetUser?.userId ?? null,
    });
    if (!targetUser) {
      // No user has a PIN at all
      const anyUser = await db.query.users.findFirst();
      if (!anyUser) {
        console.log("[/pin] No users at all → /pin/setup");
        redirect("/pin/setup");
      }
      console.log("[/pin] No user has PIN → /pin/login");
      redirect("/pin/login");
    }
  }

  // ── 3. Check full auth validity ────────────────────────────────────
  const expireSetting = await db.query.settings.findFirst({
    where: eq(settings.key, AUTH_EXPIRE_DAYS_KEY),
  });
  const expireDays = expireSetting?.value
    ? parseInt(expireSetting.value, 10)
    : DEFAULT_AUTH_EXPIRE_DAYS;

  const fullAuthValid = isFullAuthValid(targetUser.lastFullAuthAt, expireDays);
  console.log("[/pin] Full auth check", {
    userId: targetUser.userId,
    lastFullAuthAt: targetUser.lastFullAuthAt,
    expireDays,
    fullAuthValid,
  });

  if (!fullAuthValid) {
    console.log("[/pin] Full auth expired → /pin/login");
    redirect("/pin/login");
  }

  console.log("[/pin] Showing PIN screen for", targetUser.userId);
  return <PinLoginClient userId={targetUser.userId} />;
}
