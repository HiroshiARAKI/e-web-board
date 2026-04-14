// Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
// SPDX-License-Identifier: Apache-2.0
import Link from "next/link";
import { LayoutDashboard, MonitorPlay, Settings } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { PIN_SESSION_COOKIE, PIN_SETTINGS } from "@/lib/pin";
import { ThemeProvider } from "@/components/dashboard/ThemeProvider";

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
  // This prevents static prerendering from hitting DB queries during build
  // when the database has not been migrated yet (e.g. Docker build).
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(PIN_SESSION_COOKIE)?.value;

  // Check if PIN is configured
  const pinRow = await db.query.settings.findFirst({
    where: eq(settings.key, PIN_SETTINGS.PIN_HASH),
  });

  if (!pinRow?.value) {
    redirect("/pin/setup");
  }

  // Check session cookie

  if (!sessionToken) {
    redirect("/pin");
  }

  const storedSession = await db.query.settings.findFirst({
    where: eq(settings.key, PIN_SETTINGS.SESSION_SECRET),
  });

  if (!storedSession?.value || storedSession.value !== sessionToken) {
    redirect("/pin");
  }

  return (
    <ThemeProvider>
      <div id="dashboard-theme-root" className="flex min-h-full bg-background text-foreground">
        {/* Sidebar */}
        <aside className="flex w-60 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
          <div className="flex h-14 items-center px-4">
            <Link href="/boards" className="flex items-center gap-2 font-bold">
              <MonitorPlay className="size-5" />
              <span>e-Web Board</span>
            </Link>
          </div>
          <Separator />
          <nav className="flex-1 space-y-1 px-2 py-3">
            <SidebarLink href="/boards" icon={LayoutDashboard}>
              ボード管理
            </SidebarLink>
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
