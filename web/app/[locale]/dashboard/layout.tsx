"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Locale, useTranslations } from "@/lib/translations";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  HandshakeIcon,
  Lightbulb,
  FileText,
  Download,
  Menu,
  X,
} from "lucide-react";

const navItems = [
  { key: "overview", icon: BarChart3, href: "/dashboard" },
  { key: "contributions", icon: HandshakeIcon, href: "/dashboard/contributions" },
  { key: "proposals", icon: Lightbulb, href: "/dashboard/proposals" },
  { key: "ledger", icon: FileText, href: "/dashboard/ledger" },
  { key: "report", icon: Download, href: "/dashboard/report" },
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
  const { isAuthenticated, currentUser } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

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

  if (!isAuthenticated) {
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
        className="fixed top-[4.5rem] left-4 z-50 lg:hidden bg-card/90 backdrop-blur-md shadow-lg border border-border/50 w-11 h-11 rounded-xl hover:bg-card"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label={sidebarOpen ? "Close menu" : "Open menu"}
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
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          shadow-2xl lg:shadow-none
        `}
        role="navigation"
        aria-label="Dashboard navigation"
      >
        {/* Mobile close button inside sidebar */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-border/50">
          <span className="font-semibold text-foreground">
            {locale === "en" ? "Menu" : "Menu"}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="w-10 h-10"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="space-y-1 p-3 pt-4 lg:pt-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === `/${locale}${item.href}` || 
              (item.href === "/dashboard" && pathname === `/${locale}/dashboard`);
            return (
              <Link
                key={item.key}
                href={`/${locale}${item.href}`}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group min-h-[44px] ${
                  isActive
                    ? "bg-gradient-to-r from-primary/20 to-primary/10 text-primary font-medium shadow-sm border border-primary/20"
                    : "text-muted-foreground hover:bg-muted/80 hover:text-foreground active:bg-muted"
                }`}
              >
                <div className={`p-1.5 rounded-lg transition-all duration-300 ${
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted group-hover:bg-primary/10"
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-sm lg:text-base">{t(`dashboard.${item.key}`)}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Card */}
        <div className="absolute bottom-4 left-3 right-3">
          <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-amber-500/10 border border-primary/20">
            <p className="text-xs text-muted-foreground mb-2">
              {locale === "en" ? "Current Cooperative" : "Cooperative Actuelle"}
            </p>
            <p className="text-sm font-semibold text-foreground">Solar Communities Douala</p>
            {currentUser && (
              <p className="text-xs text-muted-foreground mt-2 truncate">
                {locale === "en" ? "Logged in as" : "Connecte en tant que"}: {currentUser.name}
              </p>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-gradient-to-br from-background via-background to-muted/20">
        <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 pt-20 lg:pt-8">{children}</div>
      </main>
    </div>
  );
}
