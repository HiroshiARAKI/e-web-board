// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import {
  getOwnerAccountDeletionSummary,
  type AccountDeletionSummary,
} from "@/lib/account-deletion";
import { isOwnerUser } from "@/lib/ownership";
import DeleteAccountRequestClient from "./DeleteAccountRequestClient";

export default async function DeleteAccountPage() {
  const session = await getSessionUser();
  if (!session) {
    redirect("/pin");
  }

  if (!isOwnerUser(session.user)) {
    redirect("/settings");
  }

  const summary: AccountDeletionSummary = await getOwnerAccountDeletionSummary(
    session.user.id,
  );

  return (
    <DeleteAccountRequestClient
      email={session.user.email}
      summary={summary}
    />
  );
}