// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { settings, pinResetTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateResetToken, PIN_SETTINGS, RESET_TOKEN_TTL_MS } from "@/lib/pin";
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

  const row = await db.query.settings.findFirst({
    where: eq(settings.key, PIN_SETTINGS.PIN_EMAIL),
  });

  if (!row?.value || row.value !== email) {
    // Always return success to prevent email enumeration
    return NextResponse.json({ success: true, method: isSmtpConfigured() ? "email" : "link" });
  }

  // Generate reset token
  const token = generateResetToken();
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();

  await db.insert(pinResetTokens).values({ token, expiresAt });

  // Build reset URL — prefer local network IP so other devices can access it
  const requestHost = request.headers.get("host") || "localhost:3000";
  const protocol = request.headers.get("x-forwarded-proto") || "http";
  const localIp = getLocalIp();
  const port = requestHost.includes(":") ? `:${requestHost.split(":")[1]}` : "";
  const host = localIp ? `${localIp}${port}` : requestHost;
  const resetUrl = `${protocol}://${host}/pin/reset/${token}`;

  // If SMTP is configured, send email; otherwise return URL directly
  if (isSmtpConfigured()) {
    await sendPinResetEmail(email, resetUrl);
    return NextResponse.json({ success: true, method: "email" });
  }

  return NextResponse.json({ success: true, method: "link", resetUrl });
}
