"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useParams, usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Locale, useTranslations } from "@/lib/translations";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BarChart3,
  Bell,
  BellOff,
  HandshakeIcon,
  Mail,
  Lightbulb,
  MessageSquare,
  FileText,
  Download,
  Menu,
  Settings,
  User,
  ChevronsUpDown,
} from "lucide-react";
import { useNotifications } from "@/lib/firebase/use-notifications";
import { DASHBOARD_REALTIME_POLL_INTERVAL_MS } from "@/lib/realtime";
import { getDashboardRouteForUser } from "@/lib/dashboard-routing";
import { useSelectedCooperative } from "@/lib/use-selected-cooperative";

const navItems = [
  { key: "overview", icon: BarChart3, href: "/dashboard" },
  {
    key: "contributions",
    icon: HandshakeIcon,
    href: "/dashboard/contributions",
  },
  {
    key: "invitations",
    icon: Mail,
    href: "/dashboard/invitations",
    requiresCoopAdmin: true,
  },
  { key: "proposals", icon: Lightbulb, href: "/dashboard/proposals" },
  {
    key: "vendorReviews",
    icon: MessageSquare,
    href: "/dashboard/vendor-reviews",
  },
  { key: "ledger", icon: FileText, href: "/dashboard/ledger" },
  { key: "report", icon: Download, href: "/dashboard/report" },
  {
    key: "settings",
    icon: Settings,
    href: "/dashboard/settings",
    requiresCoopAdmin: true,
  },
  { key: "profile", icon: User, href: "/dashboard/profile" },
];

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const locale = (params.locale as string) || "en";
  const t = useTranslations(locale as Locale);
  const { data: session, status } = useSession();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [notificationBannerDismissed, setNotificationBannerDismissed] =
    useState(false);
  const { notificationsEnabled, requestPermission } = useNotifications();
  const {
    allCoops,
    selectedCoop: activeCoop,
    setActiveCoopId,
    isResolvingSelection,
  } = useSelectedCooperative({
    skip: status !== "authenticated",
    pollInterval: DASHBOARD_REALTIME_POLL_INTERVAL_MS,
  });
  const cooperativeName = activeCoop?.name ?? "-";
  const userRole = activeCoop?.membership?.role;

  const handleCoopSwitch = (id: string) => {
    setActiveCoopId(id);
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/${locale}/login`);
      return;
    }

    if (status === "authenticated") {
      const expectedDashboard = getDashboardRouteForUser(session?.user, locale);
      const memberDashboard = `/${locale}/dashboard`;

      if (expectedDashboard !== memberDashboard) {
        router.replace(expectedDashboard);
      }
    }
  }, [locale, router, session?.user, status]);

  // Close sidebar when route changes
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setNotificationBannerDismissed(
      window.localStorage.getItem("notifications-banner-dismissed") === "true",
    );
  }, []);

  const dismissNotificationBanner = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("notifications-banner-dismissed", "true");
    }

    setNotificationBannerDismissed(true);
  }, []);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          <span>{t("common.loading")}</span>
        </div>
      </div>
    );
  }

  if (isResolvingSelection) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          <span>{t("common.loading")}</span>
        </div>
      </div>
    );
  }

  const visibleNavItems = navItems.filter(
    (item) =>
      !item.requiresCoopAdmin ||
      userRole === "COOP_ADMIN" ||
      userRole === "PLATFORM_ADMIN",
  );

  return (
    <div className="flex h-screen bg-background">
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="fixed top-18 left-4 z-50 lg:hidden h-11 w-11 rounded-xl border border-border/50 bg-card/90 shadow-lg backdrop-blur-md"
            aria-label={t("navigation.openMenu")}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>

        <SheetContent side="left" className="w-76 p-0">
          <SheetHeader className="border-b border-border/50">
            <SheetTitle>{t("navigation.menu")}</SheetTitle>
          </SheetHeader>

          <div className="flex h-full flex-col">
            <nav
              className="flex-1 space-y-1 overflow-y-auto p-3"
              aria-label={t("navigation.dashboardNavigation")}
            >
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === `/${locale}${item.href}` ||
                  (item.href === "/dashboard" &&
                    pathname === `/${locale}/dashboard`);

                return (
                  <SheetClose asChild key={item.key}>
                    <Link
                      href={`/${locale}${item.href}`}
                      className={`flex min-h-11 items-center gap-3 rounded-xl px-4 py-3.5 text-sm transition-all duration-200 group ${
                        isActive
                          ? "bg-linear-to-r from-primary/20 to-primary/10 text-primary font-medium border border-primary/20"
                          : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                      }`}
                    >
                      <div
                        className={`rounded-lg p-1.5 ${
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted group-hover:bg-primary/10"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <span>{t(`dashboard.${item.key}`)}</span>
                    </Link>
                  </SheetClose>
                );
              })}
            </nav>

            <div className="p-3 pb-6">
              <div className="rounded-xl border border-primary/20 bg-linear-to-br from-primary/10 to-amber-500/10 p-4">
                <p className="mb-2 text-xs text-muted-foreground">
                  {t("dashboard.currentCooperative")}
                </p>
                {allCoops.length > 1 ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex w-full items-center justify-between gap-1 text-sm font-semibold text-foreground hover:text-primary transition-colors">
                        <span className="truncate">{cooperativeName}</span>
                        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-52">
                      {allCoops.map((coop) => (
                        <DropdownMenuItem
                          key={coop.id}
                          onClick={() => handleCoopSwitch(coop.id)}
                          className={
                            coop.id === activeCoop?.id
                              ? "font-semibold text-primary"
                              : ""
                          }
                        >
                          {coop.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <p className="text-sm font-semibold text-foreground">
                    {cooperativeName}
                  </p>
                )}
                {session?.user ? (
                  <p className="mt-2 truncate text-xs text-muted-foreground">
                    {t("dashboard.loggedInAs")}: {session.user.name}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <aside
        className="hidden w-64 flex-col border-r border-border/50 bg-card/98 lg:flex"
        role="navigation"
        aria-label={t("navigation.dashboardNavigation")}
      >
        <nav className="flex-1 space-y-1 p-3 pt-6">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === `/${locale}${item.href}` ||
              (item.href === "/dashboard" &&
                pathname === `/${locale}/dashboard`);

            return (
              <Link
                key={item.key}
                href={`/${locale}${item.href}`}
                className={`flex min-h-11 items-center gap-3 rounded-xl px-4 py-3.5 text-sm transition-all duration-200 group ${
                  isActive
                    ? "bg-linear-to-r from-primary/20 to-primary/10 text-primary font-medium border border-primary/20"
                    : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                }`}
              >
                <div
                  className={`rounded-lg p-1.5 ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted group-hover:bg-primary/10"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span>{t(`dashboard.${item.key}`)}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 pb-6">
          <div className="rounded-xl border border-primary/20 bg-linear-to-br from-primary/10 to-amber-500/10 p-4">
            <p className="mb-2 text-xs text-muted-foreground">
              {t("dashboard.currentCooperative")}
            </p>
            {allCoops.length > 1 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex w-full items-center justify-between gap-1 text-sm font-semibold text-foreground hover:text-primary transition-colors">
                    <span className="truncate">{cooperativeName}</span>
                    <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-52">
                  {allCoops.map((coop) => (
                    <DropdownMenuItem
                      key={coop.id}
                      onClick={() => handleCoopSwitch(coop.id)}
                      className={
                        coop.id === activeCoop?.id
                          ? "font-semibold text-primary"
                          : ""
                      }
                    >
                      {coop.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <p className="text-sm font-semibold text-foreground">
                {cooperativeName}
              </p>
            )}
            {session?.user ? (
              <p className="mt-2 truncate text-xs text-muted-foreground">
                {t("dashboard.loggedInAs")}: {session.user.name}
              </p>
            ) : null}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-linear-to-br from-background via-background to-muted/20">
        <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 pt-20 lg:pt-8 space-y-4">
          {!notificationsEnabled && !notificationBannerDismissed ? (
            <Alert className="border-primary/20 bg-primary/5 text-foreground">
              <Bell className="h-4 w-4 text-primary" />
              <AlertDescription className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between text-sm">
                <span>{t("status.notificationsPrompt")}</span>
                <span className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => void requestPermission()}
                    className="min-h-9"
                  >
                    <Bell className="h-4 w-4" />
                    {t("status.notificationsEnable")}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={dismissNotificationBanner}
                    className="min-h-9"
                  >
                    <BellOff className="h-4 w-4" />
                    {t("status.dismissPrompt")}
                  </Button>
                </span>
              </AlertDescription>
            </Alert>
          ) : null}
          {children}
        </div>
      </main>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayoutInner>{children}</DashboardLayoutInner>;
}
