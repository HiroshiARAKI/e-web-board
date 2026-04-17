// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Settings,
  Users,
  Menu,
  X,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { LogoutButton } from "@/components/dashboard/LogoutButton";
import { KeinageLogo } from "@/components/KeinageLogo";

function SidebarLink({
  href,
  icon: Icon,
  children,
  onClick,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      <Icon className="size-4" />
      {children}
    </Link>
  );
}

export function DashboardShell({
  userId,
  role,
  children,
}: {
  userId: string;
  role: string;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const sidebarContent = (
    <>
      <div className="flex h-auto min-h-14 flex-col justify-center gap-0.5 px-4 py-3">
        <div className="flex items-center justify-between">
          <Link href="/boards" className="flex items-center gap-2 font-bold" onClick={closeSidebar}>
            <KeinageLogo className="h-5 w-auto text-foreground" />
            <span>Keinage</span>
          </Link>
          <div className="flex items-center gap-1">
            <LogoutButton />
            {/* Close button: mobile only */}
            <button
              onClick={closeSidebar}
              className="ml-1 rounded-lg p-1.5 text-muted-foreground hover:bg-accent md:hidden"
              aria-label="メニューを閉じる"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1.5 pl-0.5">
          <span className="text-xs text-muted-foreground">{userId}</span>
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
              role === "admin"
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
            }`}
          >
            {role === "admin" ? "Admin" : "General"}
          </span>
        </div>
      </div>
      <Separator />
      <nav className="flex-1 space-y-1 px-2 py-3">
        <SidebarLink href="/boards" icon={LayoutDashboard} onClick={closeSidebar}>
          ボード管理
        </SidebarLink>
        {role === "admin" && (
          <SidebarLink href="/users" icon={Users} onClick={closeSidebar}>
            ユーザー管理
          </SidebarLink>
        )}
        <SidebarLink href="/settings" icon={Settings} onClick={closeSidebar}>
          設定
        </SidebarLink>
      </nav>
    </>
  );

  return (
    <div id="dashboard-theme-root" className="flex min-h-dvh bg-background text-foreground">
      {/* Mobile header bar */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-3 border-b bg-background px-4 md:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent"
          aria-label="メニューを開く"
        >
          <Menu className="size-5" />
        </button>
        <Link href="/boards" className="flex items-center gap-2 font-bold">
          <KeinageLogo className="h-4 w-auto text-foreground" />
          <span className="text-sm">Keinage</span>
        </Link>
      </header>

      {/* Backdrop overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar: always visible on md+, overlay on mobile */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex w-60 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground
          transition-transform duration-200 ease-in-out
          md:static md:translate-x-0 md:transition-none
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {sidebarContent}
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">{children}</div>
      </main>
    </div>
  );
}
