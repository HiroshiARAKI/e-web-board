// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { redirect } from "next/navigation";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { PIN_SETTINGS } from "@/lib/pin";
import PinSetupClient from "./PinSetupClient";

export const dynamic = "force-dynamic";

export default async function PinSetupPage() {
  // If PIN is already set, redirect to login
  const row = await db.query.settings.findFirst({
    where: eq(settings.key, PIN_SETTINGS.PIN_HASH),
  });
  if (row?.value) {
    redirect("/pin");
  }

  return <PinSetupClient />;
}
