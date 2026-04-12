import Link from "next/link";
import { LayoutDashboard, MonitorPlay, Settings } from "lucide-react";
import { Separator } from "@/components/ui/separator";

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

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full">
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
  );
}
