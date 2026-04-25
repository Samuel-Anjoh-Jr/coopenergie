"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Locale, useTranslations } from "@/lib/translations";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sun, Moon, LogOut, User, Zap } from "lucide-react";

interface NavbarProps {
  locale: Locale;
}

export default function Navbar({ locale }: NavbarProps) {
  const t = useTranslations(locale);
  const router = useRouter();
  const pathname = usePathname();
  const { currentUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const isLandingPage = pathname === `/${locale}` || pathname === `/${locale}/`;

  const landingNavItems = [
    { href: "#vision", label: t("navbar.navVision") },
    { href: "#problem", label: t("navbar.navProblem") },
    { href: "#solution", label: t("navbar.navSolution") },
    { href: "#how-it-works", label: t("navbar.navHowItWorks") },
    { href: "#features", label: t("navbar.navFeatures") },
    { href: "#community", label: t("navbar.navCommunity") },
  ];

  const handleLocaleToggle = () => {
    const newLocale = locale === "en" ? "fr" : "en";
    const path = window.location.pathname.replace(`/${locale}`, `/${newLocale}`);
    router.push(path);
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <nav className="border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Reduced height on mobile (h-14), standard on desktop (md:h-16) */}
        <div className="flex justify-between items-center h-14 md:h-16">
          {/* Logo - compact on mobile */}
          <Link href={`/${locale}`} className="flex items-center gap-2 md:gap-3 group">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg md:rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-amber-500/25 transition-all duration-300 group-hover:scale-105">
              <Zap className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
            <span className="text-lg md:text-xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
              {t("navbar.logo")}
            </span>
          </Link>

          {/* Desktop nav links - hidden on mobile */}
          <div className="hidden md:flex items-center gap-6">
            {isLandingPage ? (
              landingNavItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="text-sm text-muted-foreground hover:text-foreground transition-all duration-300 hover:translate-y-[-2px] whitespace-nowrap"
                >
                  {item.label}
                </a>
              ))
            ) : (
              <>
                <Link
                  href={`/${locale}`}
                  className="text-muted-foreground hover:text-foreground transition-all duration-300 hover:translate-y-[-2px]"
                >
                  {t("navbar.home")}
                </Link>
                <Link
                  href={`/${locale}/dashboard`}
                  className="text-muted-foreground hover:text-foreground transition-all duration-300 hover:translate-y-[-2px]"
                >
                  {t("navbar.dashboard")}
                </Link>
              </>
            )}
          </div>

          {/* Right side controls - always visible, touch-friendly sizes */}
          <div className="flex items-center gap-1 md:gap-2">
            {/* Theme Toggle - 44px touch target */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="w-10 h-10 md:w-9 md:h-9 rounded-lg hover:bg-primary/10 transition-all duration-300"
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </Button>

            {/* Language Toggle - 44px touch target */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLocaleToggle}
              className="font-semibold text-sm px-3 h-10 md:h-9 hover:bg-primary/10 transition-all duration-300 min-w-[44px]"
              aria-label={locale === "en" ? "Switch to French" : "Switch to English"}
            >
              {locale === "en" ? "FR" : "EN"}
            </Button>

            {/* User Menu - 44px touch target */}
            {currentUser && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="flex items-center gap-2 h-10 md:h-9 px-2 md:px-3 hover:bg-primary/10 transition-all duration-300"
                    aria-label="User menu"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <span className="text-sm font-medium hidden sm:inline max-w-[100px] truncate">{currentUser.name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 glass-dark border-border/50">
                  <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                    {currentUser.email}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive min-h-[44px]">
                    <LogOut className="w-4 h-4 mr-2" />
                    {t("common.logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
