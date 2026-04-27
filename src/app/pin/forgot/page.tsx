// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEVICE_AUTH_COOKIE, getDeviceAuthGrantByToken } from "@/lib/device-auth";
import PinForgotClient from "./PinForgotClient";

export const dynamic = "force-dynamic";

export default async function PinForgotPage() {
  const cookieStore = await cookies();
  const deviceToken = cookieStore.get(DEVICE_AUTH_COOKIE)?.value;
  const deviceAuthGrant = await getDeviceAuthGrantByToken(deviceToken);

  if (!deviceAuthGrant?.user) {
    redirect("/pin");
  }

  if (!deviceAuthGrant.user.pinHash) {
    redirect("/pin/login");
  }

  return <PinForgotClient targetUserId={deviceAuthGrant.user.userId} />;
}
