// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { NextResponse } from "next/server";
import { networkInterfaces } from "os";
import { getAdminSessionUser } from "@/lib/auth";

/** GET /api/network — return the first non-internal IPv4 address */
export async function GET() {
  const session = await getAdminSessionUser();
  if (!session) {
    return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
  }

  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === "IPv4" && !net.internal) {
        return NextResponse.json({ ip: net.address });
      }
    }
  }
  return NextResponse.json({ ip: null });
}
