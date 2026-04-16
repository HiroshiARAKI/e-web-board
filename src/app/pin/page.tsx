// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { db } from "@/db";
import { users, authSessions, settings } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
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
  // Determine which user's PIN to request:
  // prefer last-user cookie → fallback to first admin user
  const cookieStore = await cookies();
  const lastUserId = cookieStore.get(LAST_USER_COOKIE)?.value;

  let adminUser = lastUserId
    ? await db.query.users.findFirst({ where: eq(users.userId, lastUserId) })
    : null;
  if (!adminUser) {
    adminUser = await db.query.users.findFirst();
  }
  if (!adminUser) {
    redirect("/pin/setup");
  }

  // If PIN is not set, redirect to setup
  if (!adminUser.pinHash) {
    redirect("/pin/setup");
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

  // Check if full auth (email+password) is required
  const expireSetting = await db.query.settings.findFirst({
    where: eq(settings.key, AUTH_EXPIRE_DAYS_KEY),
  });
  const expireDays = expireSetting?.value
    ? parseInt(expireSetting.value, 10)
    : DEFAULT_AUTH_EXPIRE_DAYS;

  if (!isFullAuthValid(adminUser.lastFullAuthAt, expireDays)) {
    redirect("/pin/login");
  }

  return <PinLoginClient userId={adminUser.userId} />;
}
