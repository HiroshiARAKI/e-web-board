// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { NextResponse } from "next/server";
import { db } from "@/db";
import { authSessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { AUTH_SESSION_COOKIE } from "@/lib/auth";
import { cookies } from "next/headers";

/** POST /api/auth/pin/logout — clear session */
export async function POST() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(AUTH_SESSION_COOKIE)?.value;

  if (sessionToken) {
    await db
      .delete(authSessions)
      .where(eq(authSessions.sessionToken, sessionToken));
  }

  cookieStore.delete(AUTH_SESSION_COOKIE);
  return NextResponse.json({ success: true });
}
