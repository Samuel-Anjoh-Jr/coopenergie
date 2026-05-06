"use client";

import { useParams } from "next/navigation";
import { Locale, useTranslations } from "@/lib/translations";

export default function VendorTermsPage() {
  const params = useParams();
  const locale = ((params.locale as string) || "fr") as Locale;
  const t = useTranslations(locale);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-semibold">{t("vendorTerms.title")}</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        {t("vendorTerms.paragraph1")}
      </p>
      <p className="mt-3 text-sm text-muted-foreground">
        {t("vendorTerms.paragraph2")}
      </p>
      <p className="mt-3 text-sm text-muted-foreground">
        {t("vendorTerms.activeLocale")}: {locale}
      </p>
    </main>
  );
}
