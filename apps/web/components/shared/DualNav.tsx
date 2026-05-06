"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Locale, useTranslations } from "@/lib/translations";
import { getDashboardRouteForUser } from "@/lib/dashboard-routing";
import { cn } from "@/lib/utils";
import { useDualNavScrollSpy } from "@/lib/hooks/use-dual-nav-scroll-spy";
import { restClient } from "@/lib/rest-client";

type PageType = "customer" | "vendor";

type SectionItem = {
  id: string;
  label: string;
};

type DualNavProps = {
  locale: Locale;
  currentPage: PageType;
};

export function DualNav({ locale, currentPage }: DualNavProps) {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const t = useTranslations((params.locale as string) || locale);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [displayedPage, setDisplayedPage] = useState<PageType>(currentPage);
  const [fadeOut, setFadeOut] = useState(false);
  const dashboardHref = getDashboardRouteForUser(session?.user, locale);

  const customerSections = useMemo<SectionItem[]>(
    () => [
      { id: "approach", label: t("dualNav.customerMissionVision") },
      { id: "problem", label: t("dualNav.customerProblem") },
      { id: "solution", label: t("dualNav.customerSolution") },
      { id: "how-it-works", label: t("dualNav.customerHowItWorks") },
      { id: "platform-vendors", label: t("dualNav.customerPlatformVendors") },
      { id: "transparency", label: t("dualNav.customerWhyChooseUs") },
      { id: "impact", label: t("dualNav.customerImpact") },
      { id: "faq", label: t("dualNav.customerFaq") },
    ],
    [t],
  );

  const vendorSections = useMemo<SectionItem[]>(
    () => [
      { id: "how-it-works", label: t("dualNav.vendorHowItWorks") },
      { id: "pricing", label: t("dualNav.vendorPricing") },
      { id: "why-us", label: t("dualNav.vendorWhyUs") },
      { id: "faq", label: t("dualNav.vendorFaq") },
    ],
    [t],
  );

  const visibleSections =
    displayedPage === "customer" ? customerSections : vendorSections;
  const { activeSection } = useDualNavScrollSpy(visibleSections);

  useEffect(() => {
    if (displayedPage === currentPage) {
      return;
    }

    setFadeOut(true);

    const swapTimeout = setTimeout(() => {
      setDisplayedPage(currentPage);
      setFadeOut(false);
    }, 160);

    return () => clearTimeout(swapTimeout);
  }, [currentPage, displayedPage]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleLocaleToggle = () => {
    const newLocale = locale === "en" ? "fr" : "en";
    const path = window.location.pathname.replace(
      `/${locale}`,
      `/${newLocale}`,
    );
    router.push(path);
    if (session?.user) {
      void restClient
        .patch("/users/me", { preferredLocale: newLocale })
        .catch(() => {});
    }
  };

  const handlePageSwitch = (target: PageType) => {
    const destination =
      target === "vendor" ? `/${locale}/vendors` : `/${locale}/`;
    router.push(destination);
  };

  const goToSection = (id: string, targetPage: PageType) => {
    const basePath =
      targetPage === "vendor" ? `/${locale}/vendors` : `/${locale}`;

    if (currentPage !== targetPage) {
      router.push(`${basePath}#${id}`);
      setMobileOpen(false);
      return;
    }

    const section = document.getElementById(id);
    if (!section) {
      router.push(`${basePath}#${id}`);
      setMobileOpen(false);
      return;
    }

    section.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", `${basePath}#${id}`);
    setMobileOpen(false);
  };

  const switcherClass = (isActive: boolean) =>
    cn(
      "rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-300 md:px-4 md:py-2 md:text-sm",
      isActive
        ? "border-emerald-500 text-emerald-700 bg-emerald-500/10 dark:text-emerald-300"
        : "border-border text-muted-foreground hover:text-foreground hover:border-emerald-400/60",
    );

  const desktopSwitcherClass = (isActive: boolean) =>
    cn(
      "rounded-full border px-2.5 py-1.5 text-xs font-semibold transition-all duration-300 hover:-translate-y-0.5 min-[72rem]:px-3.5 min-[72rem]:py-1.5 min-[72rem]:text-[13px] min-[80rem]:px-4 min-[80rem]:py-2 min-[80rem]:text-sm",
      isActive
        ? "border-emerald-500/70 bg-linear-to-r from-emerald-500/20 to-green-500/15 text-emerald-700 shadow-[0_8px_24px_-14px_rgba(16,185,129,0.9)] dark:text-emerald-300"
        : "border-border/80 bg-background/60 text-muted-foreground hover:border-emerald-400/60 hover:text-foreground hover:shadow-[0_10px_24px_-18px_rgba(16,185,129,0.55)]",
    );

  return (
    <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-3 md:h-16 md:gap-4 md:px-6 lg:gap-3 lg:px-6 min-[72rem]:gap-3.5 min-[72rem]:px-7 xl:gap-4 xl:px-8">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>

          <SheetContent side="left" className="w-76 p-0">
            <SheetHeader className="border-b border-border/60">
              <SheetTitle>{t("dualNav.menu")}</SheetTitle>
            </SheetHeader>

            <div className="space-y-4 p-4">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className={switcherClass(currentPage === "customer")}
                  onClick={() => handlePageSwitch("customer")}
                >
                  {t("dualNav.customerLabel")}
                </Button>
                <Button
                  variant="outline"
                  className={switcherClass(currentPage === "vendor")}
                  onClick={() => handlePageSwitch("vendor")}
                >
                  {t("dualNav.vendorLabel")}
                </Button>
              </div>

              <div className="space-y-1">
                {visibleSections.map((section) => (
                  <SheetClose asChild key={section.id}>
                    <button
                      type="button"
                      onClick={() => goToSection(section.id, currentPage)}
                      className={cn(
                        "flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition-colors",
                        activeSection === section.id
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {section.label}
                    </button>
                  </SheetClose>
                ))}
              </div>

              <div className="space-y-2 border-t border-border/60 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={handleLocaleToggle}
                >
                  {locale === "en" ? "FR" : "EN"}
                </Button>
                {session?.user ? (
                  <SheetClose asChild>
                    <Link href={dashboardHref}>
                      <Button className="w-full">
                        {t("dualNav.dashboard")}
                      </Button>
                    </Link>
                  </SheetClose>
                ) : (
                  <>
                    <SheetClose asChild>
                      <Link href={`/${locale}/login`}>
                        <Button variant="outline" className="w-full">
                          {t("common.login")}
                        </Button>
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link href={`/${locale}/signup`}>
                        <Button className="w-full">
                          {t("common.register")}
                        </Button>
                      </Link>
                    </SheetClose>
                  </>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <Link href={`/${locale}/`} className="flex items-center gap-2 shrink-0">
          <Image
            src="/logo/coopenergie-logo-full.png"
            alt={t("branding.appName")}
            width={728}
            height={179}
            className="h-7 w-auto md:h-8"
            priority
          />
        </Link>

        <div className="hidden items-center gap-2 md:flex lg:shrink-0">
          <button
            type="button"
            className={desktopSwitcherClass(currentPage === "customer")}
            onClick={() => handlePageSwitch("customer")}
          >
            {t("dualNav.customerLabel")}
          </button>
        </div>

        <div className="hidden min-w-0 flex-[1_1_auto] items-center justify-center lg:flex">
          <div
            className={cn(
              "relative isolate flex min-w-0 max-w-full items-center justify-center overflow-hidden rounded-full border border-emerald-500/20 bg-linear-to-r from-background/85 via-emerald-500/8 to-background/85 p-1 shadow-[0_12px_36px_-24px_rgba(16,185,129,0.95)] backdrop-blur-md transition-all duration-300 min-[72rem]:p-1.25 xl:p-1.5 before:absolute before:inset-x-10 before:top-0 before:h-px before:bg-linear-to-r before:from-transparent before:via-white/35 before:to-transparent before:content-[''] after:absolute after:inset-y-1 after:left-1/2 after:w-24 after:-translate-x-1/2 after:rounded-full after:bg-emerald-400/6 after:blur-2xl after:content-['']",
              fadeOut ? "translate-y-1 opacity-0" : "translate-y-0 opacity-100",
            )}
          >
            <div className="flex min-w-0 flex-1 items-stretch justify-center gap-1 overflow-hidden xl:gap-1.5">
              {visibleSections.map((section) => (
                <button
                  key={`${displayedPage}-${section.id}`}
                  type="button"
                  onClick={() => goToSection(section.id, displayedPage)}
                  className={cn(
                    "group relative flex min-h-11 min-w-0 flex-1 items-center justify-center rounded-[1.1rem] px-1.5 py-1.5 text-center text-[10px] font-medium leading-[1.12] tracking-wide transition-all duration-300 hover:-translate-y-px min-[72rem]:min-h-12 min-[72rem]:px-2 min-[72rem]:py-1.5 min-[72rem]:text-[10.5px] xl:px-2.5 xl:text-[11px] 2xl:px-3 2xl:text-xs",
                    activeSection === section.id
                      ? "bg-linear-to-r from-emerald-500 to-green-500 font-semibold text-white shadow-[0_8px_20px_-10px_rgba(16,185,129,0.95)]"
                      : "text-muted-foreground hover:bg-emerald-500/12 hover:text-foreground",
                  )}
                  title={section.label}
                >
                  <span className="block whitespace-normal wrap-break-word">
                    {section.label}
                  </span>
                  <span
                    className={cn(
                      "absolute -bottom-0.5 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-emerald-400/90 transition-all duration-300",
                      activeSection === section.id
                        ? "opacity-100"
                        : "opacity-0 group-hover:opacity-70",
                    )}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="hidden items-center gap-2 md:flex lg:shrink-0">
          <button
            type="button"
            className={desktopSwitcherClass(currentPage === "vendor")}
            onClick={() => handlePageSwitch("vendor")}
          >
            {t("dualNav.vendorLabel")}
          </button>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={handleLocaleToggle}
            className="hidden md:inline-flex h-7 items-center px-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors duration-200"
            aria-label={
              locale === "en"
                ? t("language.switchToFrench")
                : t("language.switchToEnglish")
            }
          >
            {locale === "en" ? "FR" : "EN"}
          </button>
          {session?.user ? (
            <Link href={dashboardHref}>
              <Button size="sm" className="text-xs md:text-sm">
                {t("dualNav.dashboard")}
              </Button>
            </Link>
          ) : (
            <>
              <Link href={`/${locale}/login`}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs md:text-sm"
                >
                  {t("common.login")}
                </Button>
              </Link>
              <Link href={`/${locale}/signup`}>
                <Button size="sm" className="text-xs md:text-sm">
                  {t("common.register")}
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
