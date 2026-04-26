// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, eq, isNull, or } from "drizzle-orm";
import { networkInterfaces } from "os";
import { db } from "@/db";
import { signupRequests, users } from "@/db/schema";
import { isSmtpConfigured, sendOwnerSignupEmail } from "@/lib/mail";
import {
  SIGNUP_REQUEST_COOKIE,
  computeSignupExpiry,
  generateSignupToken,
} from "@/lib/signup";

function buildSignupUrl(request: NextRequest, token: string): string {
  const requestHost = request.headers.get("host") || "localhost:3000";
  const protocol = request.headers.get("x-forwarded-proto") || "http";
  const hostname = requestHost.split(":")[0];
  const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";
  let host = requestHost;

  if (isLocalhost) {
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] ?? []) {
        if (net.family === "IPv4" && !net.internal) {
          const port = requestHost.includes(":") ? `:${requestHost.split(":")[1]}` : "";
          host = `${net.address}${port}`;
          break;
        }
      }
      if (host !== requestHost) {
        break;
      }
    }
  }

  return `${protocol}://${host}/signup/${token}`;
}

/** POST /api/auth/credentials/setup/resend — resend owner signup email */
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const signupRequestId = cookieStore.get(SIGNUP_REQUEST_COOKIE)?.value;

  if (!signupRequestId) {
    return NextResponse.json({ error: "仮登録情報が見つかりません" }, { status: 401 });
  }

  const signupRequest = await db.query.signupRequests.findFirst({
    where: and(
      eq(signupRequests.id, signupRequestId),
      isNull(signupRequests.completedAt),
    ),
  });

  if (!signupRequest) {
    return NextResponse.json({ error: "仮登録情報が見つかりません" }, { status: 404 });
  }

  const existingUser = await db.query.users.findFirst({
    where: or(
      eq(users.userId, signupRequest.userId),
      eq(users.email, signupRequest.email),
      eq(users.phoneNumber, signupRequest.phoneNumber),
    ),
  });

  if (existingUser) {
    return NextResponse.json(
      { error: "この登録情報は既に使用されています。最初からやり直してください" },
      { status: 409 },
    );
  }

  const token = generateSignupToken();
  const expiresAt = computeSignupExpiry();
  const [updatedRequest] = await db
    .update(signupRequests)
    .set({ token, expiresAt })
    .where(eq(signupRequests.id, signupRequest.id))
    .returning();

  const signupUrl = buildSignupUrl(request, token);
  const mailSent = await sendOwnerSignupEmail(updatedRequest.email, signupUrl);

  if (!mailSent && isSmtpConfigured()) {
    return NextResponse.json(
      { error: "登録メールの再送に失敗しました。時間を置いて再度お試しください" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    previewUrl: !mailSent ? signupUrl : null,
  });
}