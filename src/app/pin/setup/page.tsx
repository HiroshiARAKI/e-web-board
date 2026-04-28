// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { redirect } from "next/navigation";
import { db } from "@/db";
import { getSessionUser } from "@/lib/auth";
import PinSetupClient from "./PinSetupClient";

export const dynamic = "force-dynamic";

export default async function PinSetupPage() {
  const session = await getSessionUser();

  if (!session) {
    const anyUser = await db.query.users.findFirst();
    if (!anyUser) {
      redirect("/signup");
    }
    redirect("/pin/login");
  }

  if (session.user.pinHash) {
    redirect("/boards");
  }

  return <PinSetupClient />;
}
