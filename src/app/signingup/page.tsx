// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { signupRequests } from "@/db/schema";
import { isSmtpConfigured } from "@/lib/mail";
import {
  buildPublicAppUrl,
  isUnauthenticatedSignupPreviewEnabled,
} from "@/lib/public-origin";
import { SIGNUP_REQUEST_COOKIE } from "@/lib/signup";
import SigningUpClient from "./SigningUpClient";

export const dynamic = "force-dynamic";

export default async function SigningUpPage() {
  const cookieStore = await cookies();
  const signupRequestId = cookieStore.get(SIGNUP_REQUEST_COOKIE)?.value;

  if (!signupRequestId) {
    redirect("/signup");
  }

  const signupRequest = await db.query.signupRequests.findFirst({
    where: and(
      eq(signupRequests.id, signupRequestId),
      isNull(signupRequests.completedAt),
    ),
  });

  if (!signupRequest) {
    redirect("/signup");
  }

  const previewUrl = !isSmtpConfigured() && isUnauthenticatedSignupPreviewEnabled()
    ? buildPublicAppUrl(`/signup/${signupRequest.token}`)
    : null;

  if (!isSmtpConfigured() && !previewUrl) {
    redirect("/signup");
  }

  return (
    <SigningUpClient
      email={signupRequest.email}
      previewUrl={previewUrl}
    />
  );
}