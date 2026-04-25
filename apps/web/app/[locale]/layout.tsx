"use client";

import { useParams } from "next/navigation";
import { Locale } from "@/lib/translations";
import Navbar from "@/components/navbar";

export default function LocaleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const locale = (params.locale as string) || "fr";

  return (
    <>
      <Navbar locale={locale as Locale} />
      {children}
    </>
  );
}
