// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, pinResetTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateResetToken, RESET_TOKEN_TTL_MS } from "@/lib/pin";
import { isSmtpConfigured, sendPinResetEmail } from "@/lib/mail";
import { networkInterfaces } from "os";

/** Get the first non-internal IPv4 address */
function getLocalIp(): string | null {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return null;
}

/** POST /api/auth/pin/forgot — verify email and issue reset token */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email } = body as { email?: string };

  if (!email) {
    return NextResponse.json(
      { error: "メールアドレスを入力してください" },
      { status: 400 },
    );
  }

  const adminUser = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!adminUser) {
    // Always return success to prevent email enumeration
    return NextResponse.json({ success: true, method: isSmtpConfigured() ? "email" : "link" });
  }

  // Generate reset token
  const token = generateResetToken();
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();

  await db.insert(pinResetTokens).values({ token, expiresAt, userId: adminUser.id });

  // Build reset URL
  const requestHost = request.headers.get("host") || "localhost:3000";
  const protocol = request.headers.get("x-forwarded-proto") || "http";
  const hostname = requestHost.split(":")[0];
  const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";
  let host = requestHost;
  if (isLocalhost) {
    const localIp = getLocalIp();
    if (localIp) {
      const port = requestHost.includes(":") ? `:${requestHost.split(":")[1]}` : "";
      host = `${localIp}${port}`;
    }
  }
  const resetUrl = `${protocol}://${host}/pin/reset/${token}`;

  if (isSmtpConfigured()) {
    await sendPinResetEmail(email, resetUrl);
    return NextResponse.json({ success: true, method: "email" });
  }

  return NextResponse.json({ success: true, method: "link", resetUrl });
}
