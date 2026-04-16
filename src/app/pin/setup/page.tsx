// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import PinSetupClient from "./PinSetupClient";

export const dynamic = "force-dynamic";

export default async function PinSetupPage() {
  // If admin user exists, redirect to login
  const adminUser = await db.query.users.findFirst();
  if (adminUser) {
    redirect("/pin");
  }

  return <PinSetupClient />;
}
