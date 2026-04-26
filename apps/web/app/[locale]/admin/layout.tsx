"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Zap, LogOut, BarChart3, Building2, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

const navItems = [
  { key: "Metrics", icon: BarChart3, href: "/admin" },
  { key: "Cooperatives", icon: Building2, href: "/admin/cooperatives" },
  { key: "Settings", icon: Settings, href: "/admin/settings" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/${locale}/login`);
      return;
    }
    if (status === "authenticated" && !session?.user?.isPlatformAdmin) {
      router.push(`/${locale}/dashboard`);
    }
  }, [status, session, locale, router]);

  if (status !== "authenticated" || !session?.user?.isPlatformAdmin) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background">
      <aside className="w-64 border-r border-border/50 bg-card/98 flex flex-col">
        <div className="p-6 border-b border-border/50 flex items-center gap-3">
          <div className="w-9 h-9 bg-linear-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-foreground text-sm">CoopEnergie</p>
            <p className="text-xs text-muted-foreground">Platform Admin</p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === `/${locale}${item.href}`;
            return (
              <Link
                key={item.key}
                href={`/${locale}${item.href}`}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm ${
                  isActive
                    ? "bg-linear-to-r from-primary/20 to-primary/10 text-primary font-medium border border-primary/20"
                    : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.key}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border/50 space-y-3">
          <div className="px-2">
            <p className="text-xs font-medium text-foreground truncate">
              {session.user.name}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {session.user.email}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            onClick={() => void signOut({ callbackUrl: `/${locale}/login` })}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-linear-to-br from-background via-background to-muted/20">
        <div className="max-w-7xl mx-auto p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
