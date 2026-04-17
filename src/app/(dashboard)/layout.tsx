// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import Link from "next/link";
import { LayoutDashboard, MonitorPlay, Settings, Users } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users, authSessions, settings } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import {
  AUTH_SESSION_COOKIE,
  DEFAULT_AUTH_EXPIRE_DAYS,
  AUTH_EXPIRE_DAYS_KEY,
  isFullAuthValid,
} from "@/lib/auth";
import { ThemeProvider } from "@/components/dashboard/ThemeProvider";
import { LogoutButton } from "@/components/dashboard/LogoutButton";

function SidebarLink({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      <Icon className="size-4" />
      {children}
    </Link>
  );
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Read cookies first to signal Next.js that this layout is dynamic.
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(AUTH_SESSION_COOKIE)?.value;

  console.log("[dashboard/layout] Auth check", { hasSessionToken: !!sessionToken });

  if (!sessionToken) {
    console.log("[dashboard/layout] No session token → /pin");
    redirect("/pin");
  }

  // Validate session
  const session = await db.query.authSessions.findFirst({
    where: and(
      eq(authSessions.sessionToken, sessionToken),
      gt(authSessions.expiresAt, new Date().toISOString()),
    ),
    with: { user: true },
  });

  if (!session) {
    console.log("[dashboard/layout] Session not found or expired → /pin");
    redirect("/pin");
  }

  // Check full-auth validity
  const expireSetting = await db.query.settings.findFirst({
    where: eq(settings.key, AUTH_EXPIRE_DAYS_KEY),
  });
  const expireDays = expireSetting?.value
    ? parseInt(expireSetting.value, 10)
    : DEFAULT_AUTH_EXPIRE_DAYS;

  const fullValid = isFullAuthValid(session.user.lastFullAuthAt, expireDays);
  console.log("[dashboard/layout] Full auth check", {
    userId: session.user.userId,
    lastFullAuthAt: session.user.lastFullAuthAt,
    expireDays,
    fullValid,
  });

  if (!fullValid) {
    console.log("[dashboard/layout] Full auth expired → /pin");
    redirect("/pin");
  }

  const { userId, role, colorTheme } = session.user;

  return (
    <ThemeProvider initialTheme={colorTheme as "system" | "light" | "dark"}>
      <div id="dashboard-theme-root" className="flex min-h-dvh bg-background text-foreground">
        {/* Sidebar */}
        <aside className="flex w-60 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
          <div className="flex h-auto min-h-14 flex-col justify-center gap-0.5 px-4 py-3">
            <div className="flex items-center justify-between">
              <Link href="/boards" className="flex items-center gap-2 font-bold">
                <MonitorPlay className="size-5" />
                <span>Keinage</span>
              </Link>
              <LogoutButton />
            </div>
            <div className="flex items-center gap-1.5 pl-0.5">
              <span className="text-xs text-muted-foreground">{userId}</span>
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                role === "admin"
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                  : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
              }`}>
                {role === "admin" ? "Admin" : "General"}
              </span>
            </div>
          </div>
          <Separator />
          <nav className="flex-1 space-y-1 px-2 py-3">
            <SidebarLink href="/boards" icon={LayoutDashboard}>
              ボード管理
            </SidebarLink>
            {role === "admin" && (
              <SidebarLink href="/users" icon={Users}>
                ユーザー管理
              </SidebarLink>
            )}
            <SidebarLink href="/settings" icon={Settings}>
              設定
            </SidebarLink>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
        </main>
      </div>
    </ThemeProvider>
  );
}
