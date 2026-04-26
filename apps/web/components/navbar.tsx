"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { Locale, useTranslations } from "@/lib/translations";
import { useTheme } from "@/lib/theme-context";
import { unregisterNotificationToken } from "@/lib/firebase/use-notifications";
import { Button } from "@/components/ui/button";
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
  Sun,
  Moon,
  LogOut,
  User,
  Zap,
  Menu,
  Home,
  LayoutDashboard,
} from "lucide-react";

interface NavbarProps {
  locale: Locale;
}

export function Navbar({ locale }: NavbarProps) {
  const t = useTranslations(locale);
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activeHash, setActiveHash] = useState("");

  const isLandingPage = pathname === `/${locale}` || pathname === `/${locale}/`;
  const landingSectionIds = [
    "vision",
    "problem",
    "solution",
    "how-it-works",
    "features",
    "community",
  ];

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
    const path = window.location.pathname.replace(
      `/${locale}`,
      `/${newLocale}`,
    );
    router.push(path);
  };

  const handleLogout = async () => {
    try {
      await unregisterNotificationToken();
    } catch {
      // Keep logout non-blocking if token cleanup fails.
    }

    await signOut({ callbackUrl: "/login" });
  };

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncHash = () => {
      setActiveHash(window.location.hash || "");
    };

    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [pathname]);

  useEffect(() => {
    if (!isLandingPage || typeof window === "undefined") {
      return;
    }

    const sections = landingSectionIds
      .map((id) => document.getElementById(id))
      .filter(
        (section): section is HTMLElement => section instanceof HTMLElement,
      );

    if (sections.length === 0) {
      return;
    }

    const visibilityById = new Map<string, number>();

    const updateActiveFromVisibility = () => {
      let bestId = "";
      let bestRatio = 0;

      for (const id of landingSectionIds) {
        const ratio = visibilityById.get(id) ?? 0;
        if (ratio > bestRatio) {
          bestRatio = ratio;
          bestId = id;
        }
      }

      const nextHash = bestId ? `#${bestId}` : "";

      if (nextHash && nextHash !== window.location.hash) {
        window.history.replaceState(
          null,
          "",
          `${window.location.pathname}${nextHash}`,
        );
      }

      if (activeHash !== nextHash) {
        setActiveHash(nextHash);
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const targetId = (entry.target as HTMLElement).id;
          visibilityById.set(
            targetId,
            entry.isIntersecting ? entry.intersectionRatio : 0,
          );
        }

        updateActiveFromVisibility();
      },
      {
        root: null,
        rootMargin: "-15% 0px -55% 0px",
        threshold: [0.1, 0.25, 0.5, 0.75, 1],
      },
    );

    for (const section of sections) {
      observer.observe(section);
    }

    return () => {
      observer.disconnect();
    };
  }, [isLandingPage, pathname, activeHash]);

  const handleLandingNavClick = (
    hashHref: string,
    event?: React.MouseEvent<HTMLAnchorElement>,
  ) => {
    if (event) {
      event.preventDefault();
    }

    const targetId = hashHref.replace("#", "");
    if (!targetId) {
      return;
    }

    const target = document.getElementById(targetId);
    if (!target) {
      return;
    }

    target.scrollIntoView({ behavior: "smooth", block: "start" });
    const nextHash = `#${targetId}`;
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${nextHash}`,
    );
    setActiveHash(nextHash);
    setMobileNavOpen(false);
  };

  const mobileNavItemClass = (isActive: boolean) =>
    `relative flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-300 ${
      isActive
        ? "bg-linear-to-r from-primary/20 to-primary/10 text-primary font-semibold border border-primary/25 shadow-sm"
        : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
    }`;

  const desktopLandingNavItemClass = (isActive: boolean) =>
    `relative text-sm whitespace-nowrap transition-all duration-300 after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:w-full after:rounded-full after:transition-all after:duration-300 ${
      isActive
        ? "text-foreground font-semibold after:bg-primary"
        : "text-muted-foreground hover:text-foreground after:bg-primary/0 hover:after:bg-primary/45"
    }`;

  return (
    <nav className="border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 md:h-16">
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-lg md:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>

            <SheetContent side="left" className="w-76 p-0">
              <SheetHeader className="border-b border-border/50">
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>

              <div className="flex h-full flex-col">
                <nav className="flex-1 space-y-2 p-4">
                  {isLandingPage ? (
                    <>
                      <SheetClose asChild>
                        <Link
                          href={`/${locale}`}
                          className={mobileNavItemClass(activeHash === "")}
                        >
                          <span
                            className={`absolute left-1.5 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full transition-all duration-300 ${
                              activeHash === ""
                                ? "bg-primary opacity-100"
                                : "bg-primary opacity-0"
                            }`}
                            aria-hidden="true"
                          />
                          <Home
                            className={`h-4 w-4 transition-transform duration-300 ${
                              activeHash === ""
                                ? "scale-110 motion-safe:animate-pulse"
                                : ""
                            }`}
                          />
                          {t("navbar.home")}
                        </Link>
                      </SheetClose>

                      {landingNavItems.map((item) => {
                        const isActive = activeHash === item.href;

                        return (
                          <SheetClose asChild key={item.href}>
                            <a
                              href={`/${locale}${item.href}`}
                              className={mobileNavItemClass(isActive)}
                              onClick={(event) =>
                                handleLandingNavClick(item.href, event)
                              }
                            >
                              <span
                                className={`absolute left-1.5 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full transition-all duration-300 ${
                                  isActive
                                    ? "bg-primary opacity-100"
                                    : "bg-primary opacity-0"
                                }`}
                                aria-hidden="true"
                              />
                              <span
                                className={`h-2 w-2 rounded-full transition-all duration-300 ${
                                  isActive
                                    ? "bg-primary nav-active-dot"
                                    : "bg-muted-foreground/50"
                                }`}
                                aria-hidden="true"
                              />
                              {item.label}
                            </a>
                          </SheetClose>
                        );
                      })}
                    </>
                  ) : (
                    <>
                      {(() => {
                        const isHomeActive =
                          pathname === `/${locale}` ||
                          pathname === `/${locale}/`;
                        return (
                          <SheetClose asChild>
                            <Link
                              href={`/${locale}`}
                              className={mobileNavItemClass(isHomeActive)}
                            >
                              <span
                                className={`absolute left-1.5 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full transition-all duration-300 ${
                                  isHomeActive
                                    ? "bg-primary opacity-100"
                                    : "bg-primary opacity-0"
                                }`}
                                aria-hidden="true"
                              />
                              <Home
                                className={`h-4 w-4 transition-transform duration-300 ${
                                  isHomeActive
                                    ? "scale-110 motion-safe:animate-pulse"
                                    : ""
                                }`}
                              />
                              {t("navbar.home")}
                            </Link>
                          </SheetClose>
                        );
                      })()}

                      {(() => {
                        const isDashboardActive = pathname.startsWith(
                          `/${locale}/dashboard`,
                        );
                        return (
                          <SheetClose asChild>
                            <Link
                              href={`/${locale}/dashboard`}
                              className={mobileNavItemClass(isDashboardActive)}
                            >
                              <span
                                className={`absolute left-1.5 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full transition-all duration-300 ${
                                  isDashboardActive
                                    ? "bg-primary opacity-100"
                                    : "bg-primary opacity-0"
                                }`}
                                aria-hidden="true"
                              />
                              <LayoutDashboard
                                className={`h-4 w-4 transition-transform duration-300 ${
                                  isDashboardActive
                                    ? "scale-110 motion-safe:animate-pulse"
                                    : ""
                                }`}
                              />
                              {t("navbar.dashboard")}
                            </Link>
                          </SheetClose>
                        );
                      })()}
                    </>
                  )}
                </nav>

                <div className="space-y-3 border-t border-border/50 p-4 pb-6">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={toggleTheme}
                    >
                      {theme === "dark" ? (
                        <>
                          <Sun className="mr-2 h-4 w-4" />
                          {t("theme.switchToLight")}
                        </>
                      ) : (
                        <>
                          <Moon className="mr-2 h-4 w-4" />
                          {t("theme.switchToDark")}
                        </>
                      )}
                    </Button>
                    <Button variant="outline" onClick={handleLocaleToggle}>
                      {locale === "en" ? "FR" : "EN"}
                    </Button>
                  </div>

                  {session?.user ? (
                    <>
                      <p className="px-1 text-xs text-muted-foreground">
                        {session.user.email}
                      </p>
                      <Button
                        variant="destructive"
                        className="w-full"
                        onClick={() => void handleLogout()}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        {t("common.logout")}
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <Link
            href={`/${locale}`}
            className="flex items-center gap-2 md:gap-3 group"
          >
            <div className="w-8 h-8 md:w-10 md:h-10 bg-linear-to-br from-amber-400 to-amber-600 rounded-lg md:rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-amber-500/25 transition-all duration-300 group-hover:scale-105">
              <Zap className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
            <span className="text-lg md:text-xl font-bold bg-linear-to-r from-foreground to-foreground/80 bg-clip-text">
              {t("navbar.logo")}
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            {isLandingPage ? (
              landingNavItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className={desktopLandingNavItemClass(
                    activeHash === item.href,
                  )}
                  onClick={(event) => handleLandingNavClick(item.href, event)}
                >
                  {item.label}
                </a>
              ))
            ) : (
              <>
                <Link
                  href={`/${locale}`}
                  className="text-muted-foreground hover:text-foreground transition-all duration-300 hover:-translate-y-0.5"
                >
                  {t("navbar.home")}
                </Link>
                <Link
                  href={`/${locale}/dashboard`}
                  className="text-muted-foreground hover:text-foreground transition-all duration-300 hover:-translate-y-0.5"
                >
                  {t("navbar.dashboard")}
                </Link>
              </>
            )}
          </div>

          <div className="hidden md:flex items-center gap-1 md:gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="w-10 h-10 md:w-9 md:h-9 rounded-lg hover:bg-primary/10 transition-all duration-300"
              aria-label={
                theme === "dark"
                  ? t("theme.switchToLight")
                  : t("theme.switchToDark")
              }
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLocaleToggle}
              className="font-semibold text-sm px-3 h-10 md:h-9 hover:bg-primary/10 transition-all duration-300 min-w-11"
              aria-label={
                locale === "en"
                  ? t("language.switchToFrench")
                  : t("language.switchToEnglish")
              }
            >
              {locale === "en" ? "FR" : "EN"}
            </Button>

            {session?.user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-2 h-10 md:h-9 px-2 md:px-3 hover:bg-primary/10 transition-all duration-300"
                    aria-label={t("navigation.userMenu")}
                  >
                    <div className="w-8 h-8 rounded-full bg-linear-to-br from-primary to-accent flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <span className="text-sm font-medium hidden sm:inline max-w-25 truncate">
                      {session.user.name}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-48 glass-dark border-border/50"
                >
                  <DropdownMenuItem
                    disabled
                    className="text-xs text-muted-foreground"
                  >
                    {session.user.email}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-destructive focus:text-destructive min-h-11"
                  >
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

export default Navbar;
