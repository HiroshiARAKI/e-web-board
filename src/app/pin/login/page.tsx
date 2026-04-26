// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { db } from "@/db";
import { authSessions } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { AUTH_SESSION_COOKIE } from "@/lib/auth";
import LoginClient from "./LoginClient";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  console.log("[/pin/login] START");

  // If admin user not configured, redirect to setup
  const adminUser = await db.query.users.findFirst();
  if (!adminUser) {
    console.log("[/pin/login] No users → /signup");
    redirect("/signup");
  }

  // If already authenticated, redirect to dashboard
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(AUTH_SESSION_COOKIE)?.value;
  if (sessionCookie) {
    const sessionRow = await db.query.authSessions.findFirst({
      where: and(
        eq(authSessions.sessionToken, sessionCookie),
        gt(authSessions.expiresAt, new Date().toISOString()),
      ),
    });
    if (sessionRow) {
      console.log("[/pin/login] Already authenticated → /boards");
      redirect("/boards");
    }
    console.log("[/pin/login] Session cookie present but invalid/expired");
  }

  console.log("[/pin/login] Rendering LoginClient");
  return <LoginClient />;
}
