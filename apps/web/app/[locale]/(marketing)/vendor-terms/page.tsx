"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Locale, useTranslations } from "@/lib/translations";
import { restClient } from "@/lib/rest-client";

type LegalPayload = {
  terms?: {
    title?: string;
    paragraphs?: string[];
  };
};

export default function VendorTermsPage() {
  const params = useParams();
  const locale = ((params.locale as string) || "fr") as Locale;
  const t = useTranslations(locale);
  const [legal, setLegal] = useState<LegalPayload | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadLegal() {
      try {
        const data = await restClient.get<LegalPayload>(
          `/public/legal?locale=${locale}`,
        );
        if (mounted) {
          setLegal(data);
        }
      } catch {
        // Keep translation fallback content.
      }
    }

    void loadLegal();

    return () => {
      mounted = false;
    };
  }, [locale]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-semibold">
        {legal?.terms?.title || t("vendorTerms.title")}
      </h1>
      <p className="mt-4 text-sm text-muted-foreground">
        {legal?.terms?.paragraphs?.[0] || t("vendorTerms.paragraph1")}
      </p>
      <p className="mt-3 text-sm text-muted-foreground">
        {legal?.terms?.paragraphs?.[1] || t("vendorTerms.paragraph2")}
      </p>
      <p className="mt-3 text-sm text-muted-foreground">
        {t("vendorTerms.activeLocale")}: {locale}
      </p>
    </main>
  );
}
