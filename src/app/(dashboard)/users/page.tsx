// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { db } from "@/db";
import { authSessions } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { AUTH_SESSION_COOKIE } from "@/lib/auth";
import { getRequestI18n } from "@/lib/i18n-server";
import { UserManagement } from "@/components/dashboard/UserManagement";

export default async function UsersPage() {
  const { t } = await getRequestI18n();
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_SESSION_COOKIE)?.value;
  if (!token) redirect("/pin");

  const session = await db.query.authSessions.findFirst({
    where: and(
      eq(authSessions.sessionToken, token),
      gt(authSessions.expiresAt, new Date().toISOString()),
    ),
    with: { user: true },
  });

  if (!session || session.user.role !== "admin") {
    redirect("/boards");
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">{t("users.title")}</h1>
      <UserManagement />
    </div>
  );
}
