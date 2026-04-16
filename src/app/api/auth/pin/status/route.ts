// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  DEFAULT_AUTH_EXPIRE_DAYS,
  AUTH_EXPIRE_DAYS_KEY,
  computeFullAuthExpiry,
} from "@/lib/auth";

/** GET /api/auth/pin/status — check if admin user and PIN are configured */
export async function GET() {
  const adminUser = await db.query.users.findFirst();

  const expireSetting = await db.query.settings.findFirst({
    where: eq(settings.key, AUTH_EXPIRE_DAYS_KEY),
  });
  const expireDays = expireSetting?.value
    ? parseInt(expireSetting.value, 10)
    : DEFAULT_AUTH_EXPIRE_DAYS;

  const fullAuthExpiry = adminUser
    ? computeFullAuthExpiry(adminUser.lastFullAuthAt, expireDays)
    : null;

  return NextResponse.json({
    userConfigured: !!adminUser,
    pinConfigured: !!adminUser?.pinHash,
    email: adminUser?.email ?? null,
    userId: adminUser?.userId ?? null,
    fullAuthExpiry: fullAuthExpiry?.toISOString() ?? null,
    authExpireDays: expireDays,
  });
}
