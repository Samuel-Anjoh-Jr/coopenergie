"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import Image from "next/image";
import {
  LogOut,
  BarChart3,
  Building2,
  Settings,
  Menu,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const navItems = [
  { key: "Metrics", icon: BarChart3, href: "/admin" },
  { key: "Cooperatives", icon: Building2, href: "/admin/cooperatives" },
  { key: "Admin Key Health", icon: ShieldCheck, href: "/admin/coop-admin-health" },
  { key: "Users & Audit", icon: ShieldCheck, href: "/admin/users" },
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/${locale}/login`);
      return;
    }
    if (status === "authenticated" && !session?.user?.isPlatformAdmin) {
      router.push(`/${locale}/dashboard`);
    }
  }, [status, session, locale, router]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  if (status !== "authenticated" || !session?.user?.isPlatformAdmin) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background">
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="fixed top-18 left-4 z-50 h-11 w-11 rounded-xl border border-border/50 bg-card/90 shadow-lg backdrop-blur-md lg:hidden"
            aria-label="Open admin menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>

        <SheetContent side="left" className="w-76 p-0">
          <SheetHeader className="border-b border-border/50">
            <SheetTitle>Admin Menu</SheetTitle>
          </SheetHeader>

          <div className="flex h-full flex-col">
            <nav className="flex-1 space-y-1 p-3">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === `/${locale}${item.href}`;

                return (
                  <SheetClose asChild key={item.key}>
                    <Link
                      href={`/${locale}${item.href}`}
                      className={`flex min-h-11 items-center gap-3 rounded-xl px-4 py-3 text-sm transition-all duration-200 ${
                        isActive
                          ? "bg-linear-to-r from-primary/20 to-primary/10 text-primary font-medium border border-primary/20"
                          : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.key}
                    </Link>
                  </SheetClose>
                );
              })}
            </nav>

            <div className="space-y-3 border-t border-border/50 p-4 pb-6">
              <div className="px-2">
                <p className="truncate text-xs font-medium text-foreground">
                  {session.user.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {session.user.email}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-muted-foreground hover:text-foreground"
                onClick={() =>
                  void signOut({ callbackUrl: `/${locale}/login` })
                }
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <aside className="hidden w-64 flex-col border-r border-border/50 bg-card/98 lg:flex">
        <div className="p-6 border-b border-border/50 space-y-3">
          <Image
            src="/logo/coopenergie-logo-full.png"
            alt="CoopEnergie"
            width={728}
            height={179}
            className="h-8 w-auto drop-shadow-[0_1px_0_rgba(15,23,42,0.08)] dark:drop-shadow-[0_1px_0_rgba(248,250,252,0.12)]"
            priority
          />
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Platform Admin
          </p>
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
        <div className="mx-auto max-w-7xl p-4 pt-20 md:p-6 lg:p-8 lg:pt-8">
          {children}
        </div>
      </main>
    </div>
  );
}
