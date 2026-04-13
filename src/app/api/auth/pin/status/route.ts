// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { NextResponse } from "next/server";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { PIN_SETTINGS } from "@/lib/pin";

/** GET /api/auth/pin/status — check if PIN is configured */
export async function GET() {
  const row = await db.query.settings.findFirst({
    where: eq(settings.key, PIN_SETTINGS.PIN_HASH),
  });
  const emailRow = await db.query.settings.findFirst({
    where: eq(settings.key, PIN_SETTINGS.PIN_EMAIL),
  });
  return NextResponse.json({
    configured: !!row?.value,
    email: emailRow?.value ?? null,
  });
}
