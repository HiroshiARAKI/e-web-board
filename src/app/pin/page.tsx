// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { PIN_SETTINGS, PIN_SESSION_COOKIE } from "@/lib/pin";
import PinLoginClient from "./PinLoginClient";

export const dynamic = "force-dynamic";

export default async function PinLoginPage() {
  // If PIN is not set, redirect to setup
  const pinRow = await db.query.settings.findFirst({
    where: eq(settings.key, PIN_SETTINGS.PIN_HASH),
  });
  if (!pinRow?.value) {
    redirect("/pin/setup");
  }

  // If already authenticated, redirect to dashboard
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(PIN_SESSION_COOKIE);
  if (sessionCookie?.value) {
    const sessionRow = await db.query.settings.findFirst({
      where: eq(settings.key, PIN_SETTINGS.SESSION_SECRET),
    });
    if (sessionRow?.value === sessionCookie.value) {
      redirect("/boards");
    }
  }

  return <PinLoginClient />;
}
