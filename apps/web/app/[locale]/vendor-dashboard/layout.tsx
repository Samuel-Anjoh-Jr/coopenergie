"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/lib/translations";
import { getDashboardRouteForUser } from "@/lib/dashboard-routing";

type VendorLayoutProps = {
  children: React.ReactNode;
};

export default function VendorDashboardLayout({ children }: VendorLayoutProps) {
  const { status, data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const locale = (params.locale as "fr" | "en") || "en";
  const t = useTranslations(locale);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/${locale}/login`);
      return;
    }

    if (status === "authenticated") {
      const expectedDashboard = getDashboardRouteForUser(session?.user, locale);
      const vendorDashboard = `/${locale}/vendor-dashboard`;

      if (expectedDashboard !== vendorDashboard) {
        router.replace(expectedDashboard);
      }
    }
  }, [locale, router, session?.user, status]);

  if (
    status !== "authenticated" ||
    getDashboardRouteForUser(session?.user, locale) !==
      `/${locale}/vendor-dashboard`
  ) {
    return null;
  }

  const navItems = [
    {
      href: `/${locale}/vendor-dashboard`,
      label: t("vendorDashboard.navigation.overview"),
    },
    {
      href: `/${locale}/vendor-dashboard/profile`,
      label: t("vendorDashboard.navigation.profile"),
    },
    {
      href: `/${locale}/vendor-dashboard/contact`,
      label: t("vendorDashboard.navigation.contact"),
    },
    {
      href: `/${locale}/vendor-dashboard/products`,
      label: t("vendorDashboard.navigation.products"),
    },
    {
      href: `/${locale}/vendor-dashboard/subscription`,
      label: t("vendorDashboard.navigation.subscription"),
    },
    {
      href: `/${locale}/vendor-dashboard/reviews`,
      label: t("vendorDashboard.navigation.reviews"),
    },
  ];

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-6 lg:grid-cols-[260px_1fr]">
      <Card className="h-fit border-border/70 p-3">
        <p className="px-2 pb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t("vendorDashboard.navigationTitle")}
        </p>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive =
              item.href === `/${locale}/vendor-dashboard`
                ? pathname === item.href
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </Card>

      <section className="min-w-0">{children}</section>
    </main>
  );
}
