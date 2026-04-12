// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import { SettingsClient } from "@/components/dashboard/SettingsClient";

export default function SettingsPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">設定</h1>
      <SettingsClient />
    </div>
  );
}
