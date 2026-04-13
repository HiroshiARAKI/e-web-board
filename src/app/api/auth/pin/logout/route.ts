// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { NextResponse } from "next/server";
import { PIN_SESSION_COOKIE } from "@/lib/pin";
import { cookies } from "next/headers";

/** POST /api/auth/pin/logout — clear session cookie */
export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(PIN_SESSION_COOKIE);
  return NextResponse.json({ success: true });
}
