"use client";

import { useEffect, useState, useCallback } from "react";
import { useQuery } from "@apollo/client";
import { useSession } from "next-auth/react";
import { useParams, usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Locale, useTranslations } from "@/lib/translations";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  BarChart3,
  Bell,
  BellOff,
  HandshakeIcon,
  Mail,
  Lightbulb,
  FileText,
  Download,
  Menu,
  X,
  Settings,
  User,
} from "lucide-react";
import { useNotifications } from "@/lib/firebase/use-notifications";
import { GET_MY_COOPERATIVES } from "@/lib/graphql/queries/cooperative";

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
  { key: "ledger", icon: FileText, href: "/dashboard/ledger" },
  { key: "report", icon: Download, href: "/dashboard/report" },
  { key: "settings", icon: Settings, href: "/dashboard/settings" },
  { key: "profile", icon: User, href: "/dashboard/profile" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const locale = (params.locale as string) || "en";
  const t = useTranslations(locale as Locale);
  const { data: session, status } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationBannerDismissed, setNotificationBannerDismissed] =
    useState(false);
  const { notificationsEnabled, requestPermission } = useNotifications();
  const { data: myCooperativesData } = useQuery(GET_MY_COOPERATIVES, {
    skip: status !== "authenticated",
  });
  const cooperativeName = myCooperativesData?.myCooperatives?.[0]?.name ?? "-";
  const userRole = myCooperativesData?.myCooperatives?.[0]?.membership?.role;

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Close sidebar when route changes
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Close sidebar on escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      setSidebarOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

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

  if (status !== "authenticated") {
    return null;
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile Backdrop Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Menu Button - Fixed position with proper touch target (44px min) */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-18 left-4 z-50 lg:hidden bg-card/90 backdrop-blur-md shadow-lg border border-border/50 w-11 h-11 rounded-xl hover:bg-card"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label={
          sidebarOpen ? t("navigation.closeMenu") : t("navigation.openMenu")
        }
        aria-expanded={sidebarOpen}
      >
        {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {/* Sidebar - Slide-in drawer on mobile */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-72 lg:w-64 border-r border-border/50 bg-card/98 backdrop-blur-md
          transform transition-transform duration-300 ease-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          shadow-2xl lg:shadow-none
        `}
        role="navigation"
        aria-label={t("navigation.dashboardNavigation")}
      >
        {/* Mobile close button inside sidebar */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-border/50">
          <span className="font-semibold text-foreground">
            {t("navigation.menu")}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="w-10 h-10"
            onClick={() => setSidebarOpen(false)}
            aria-label={t("navigation.closeMenu")}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="space-y-1 p-3 pt-4 lg:pt-6">
          {navItems
            .filter(
              (item) => !item.requiresCoopAdmin || userRole === "COOP_ADMIN",
            )
            .map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === `/${locale}${item.href}` ||
                (item.href === "/dashboard" &&
                  pathname === `/${locale}/dashboard`);
              return (
                <Link
                  key={item.key}
                  href={`/${locale}${item.href}`}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group min-h-11 ${
                    isActive
                      ? "bg-linear-to-r from-primary/20 to-primary/10 text-primary font-medium shadow-sm border border-primary/20"
                      : "text-muted-foreground hover:bg-muted/80 hover:text-foreground active:bg-muted"
                  }`}
                >
                  <div
                    className={`p-1.5 rounded-lg transition-all duration-300 ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted group-hover:bg-primary/10"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-sm lg:text-base">
                    {t(`dashboard.${item.key}`)}
                  </span>
                </Link>
              );
            })}
        </nav>

        {/* Bottom Card */}
        <div className="absolute bottom-4 left-3 right-3">
          <div className="p-4 rounded-xl bg-linear-to-br from-primary/10 to-amber-500/10 border border-primary/20">
            <p className="text-xs text-muted-foreground mb-2">
              {t("dashboard.currentCooperative")}
            </p>
            <p className="text-sm font-semibold text-foreground">
              {cooperativeName}
            </p>
            {session?.user && (
              <p className="text-xs text-muted-foreground mt-2 truncate">
                {t("dashboard.loggedInAs")}: {session.user.name}
              </p>
            )}
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
