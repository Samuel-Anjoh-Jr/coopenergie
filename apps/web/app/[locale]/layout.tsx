"use client";

import { useParams, usePathname } from "next/navigation";
import { Locale } from "@/lib/translations";
import { Navbar } from "@/components/navbar";
import { DualNav } from "@/components/shared/DualNav";
import { CoopProvider } from "@/lib/coop-context";

export default function LocaleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const locale = (params.locale as string) || "fr";

  const customerLandingPath = `/${locale}`;
  const vendorLandingPath = `/${locale}/vendors`;
  const isCustomerLanding = pathname === customerLandingPath;
  const isVendorLanding = pathname === vendorLandingPath;
  const isMarketingLanding = isCustomerLanding || isVendorLanding;

  return (
    <CoopProvider>
      {isMarketingLanding ? (
        <DualNav
          locale={locale as Locale}
          currentPage={isVendorLanding ? "vendor" : "customer"}
        />
      ) : (
        <Navbar locale={locale as Locale} />
      )}
      {children}
    </CoopProvider>
  );
}
