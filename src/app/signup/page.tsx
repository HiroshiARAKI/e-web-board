// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import SignupRequestClient from "./SignupRequestClient";
import { isGoogleAuthEnabled } from "@/lib/google-auth";

export const dynamic = "force-dynamic";

export default function SignupPage() {
  return <SignupRequestClient googleAuthEnabled={isGoogleAuthEnabled()} />;
}
