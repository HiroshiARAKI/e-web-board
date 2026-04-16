// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
"use client";

import { LogOut } from "lucide-react";

export function LogoutButton() {
  async function handleLogout() {
    await fetch("/api/auth/pin/logout", { method: "POST" });
    window.location.href = "/pin";
  }

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      <LogOut className="size-3.5" />
      ログアウト
    </button>
  );
}
