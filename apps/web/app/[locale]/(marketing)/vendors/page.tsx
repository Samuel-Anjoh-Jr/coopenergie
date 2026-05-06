"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery } from "@apollo/client";
import { ArrowRight } from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GET_MONETISATION_SETTINGS } from "@/lib/graphql/queries/marketing";
import { getDashboardRouteForUser } from "@/lib/dashboard-routing";
import { restClient } from "@/lib/rest-client";
import { useScrollRevealGroup } from "@/lib/hooks/use-scroll-reveal-group";
import { Locale, useTranslations } from "@/lib/translations";
import { ScrollReveal } from "@/components/shared/ScrollReveal";

type MonetisationSettings = {
  monetisationSettings: {
    vendorPaymentModel: "ONE_TIME" | "SUBSCRIPTION";
    vendorOneTimeFeeXAF: number;
    vendorMonthlyFeeXAF: number;
    vendorYearlyFeeXAF: number;
  };
};

type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

function formatXaf(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "fr" ? "fr-CM" : "en-CM", {
    style: "currency",
    currency: "XAF",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function VendorsLandingPage() {
  const params = useParams();
  const locale = (params.locale as Locale) || "fr";
  const t = useTranslations(locale);
  const { data: session } = useSession();
  const howItWorksRef = useRef<HTMLDivElement>(null);
  const pricingRef = useRef<HTMLDivElement>(null);
  const faqRef = useRef<HTMLDivElement>(null);

  useScrollRevealGroup(howItWorksRef, ".reveal-item", {
    initialDelayMs: 90,
    staggerMs: 110,
    threshold: 0.2,
  });
  useScrollRevealGroup(pricingRef, ".reveal-item", {
    initialDelayMs: 100,
    staggerMs: 110,
    threshold: 0.2,
  });
  useScrollRevealGroup(faqRef, ".reveal-item", {
    initialDelayMs: 80,
    staggerMs: 95,
    threshold: 0.18,
  });

  const { data } = useQuery<MonetisationSettings>(GET_MONETISATION_SETTINGS);
  const settings = data?.monetisationSettings;

  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  useEffect(() => {
    restClient
      .get<FaqItem[]>(`/faq?audience=VENDOR&locale=${locale}`)
      .then(setFaqs)
      .catch(() => {});
  }, [locale]);

  const oneTime = settings?.vendorOneTimeFeeXAF ?? 15000;
  const monthly = settings?.vendorMonthlyFeeXAF ?? 15000;
  const yearly = settings?.vendorYearlyFeeXAF ?? 150000;
  const dashboardHref = getDashboardRouteForUser(session?.user, locale);

  return (
    <main className="bg-background text-foreground">
      <section
        id="hero"
        className="relative overflow-hidden border-b border-border/60 min-h-[60vh] flex items-center"
      >
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/hero-vendor.jpg"
            alt=""
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-linear-to-br from-emerald-900/10 via-transparent to-primary/5" />
          <div className="absolute inset-0 bg-linear-to-r from-background via-background/95 to-background/70 dark:from-background dark:via-background/90 dark:to-transparent" />
          <div className="absolute inset-0 bg-linear-to-t from-background via-transparent to-transparent" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-6 py-20 md:py-28 lg:px-8">
          <ScrollReveal
            direction="up"
            delay={240}
            threshold={0.22}
            className="max-w-3xl"
          >
            <Badge className="mb-4 bg-emerald-500/12 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300">
              {t("vendorLanding.hero.badge")}
            </Badge>
            <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">
              {t("vendorLanding.hero.title")}
            </h1>
            <p className="mt-6 max-w-2xl text-base text-muted-foreground md:text-lg">
              {t("vendorLanding.hero.subtitle")}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {session?.user ? (
                <Link href={dashboardHref}>
                  <Button size="lg">
                    {t("vendorLanding.hero.ctaDashboard")}
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href={`/${locale}/signup?role=VENDOR`}>
                    <Button size="lg">
                      {t("vendorLanding.hero.ctaSignup")}
                    </Button>
                  </Link>
                  <Link href={`/${locale}/login`}>
                    <Button size="lg" variant="outline">
                      {t("vendorLanding.hero.ctaLogin")}
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section
        id="how-it-works"
        className="mx-auto max-w-7xl px-6 py-16 lg:px-8"
      >
        <ScrollReveal direction="up" delay={40}>
          <h2 className="text-3xl font-semibold tracking-tight">
            {t("vendorLanding.howItWorks.title")}
          </h2>
        </ScrollReveal>
        <div ref={howItWorksRef} className="mt-8 grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((step) => (
            <Card
              key={step}
              className={[
                "reveal-item",
                step === 1
                  ? "reveal-from-left"
                  : step === 2
                    ? "reveal-from-up"
                    : "reveal-from-right",
              ].join(" ")}
            >
              <CardHeader>
                <Badge variant="secondary" className="w-fit">
                  {t(`vendorLanding.howItWorks.step${step}.badge`)}
                </Badge>
                <CardTitle>
                  {t(`vendorLanding.howItWorks.step${step}.title`)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {t(`vendorLanding.howItWorks.step${step}.description`)}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="pricing" className="border-y border-border/60 bg-muted/30">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
          <ScrollReveal direction="up" delay={50}>
            <h2 className="text-3xl font-semibold tracking-tight">
              {t("vendorLanding.pricing.title")}
            </h2>
            <p className="mt-3 text-muted-foreground">
              {t("vendorLanding.pricing.subtitle")}
            </p>
          </ScrollReveal>

          <div ref={pricingRef} className="mt-8">
            {(!settings || settings.vendorPaymentModel === "ONE_TIME") && (
              <div className="flex justify-center">
                <Card className="reveal-item reveal-from-up w-full max-w-sm">
                  <CardHeader>
                    <CardTitle>
                      {t("vendorLanding.pricing.oneTime.title")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-semibold">
                      {formatXaf(oneTime, locale)}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {t("vendorLanding.pricing.oneTime.description")}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {settings?.vendorPaymentModel === "SUBSCRIPTION" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Card className="reveal-item reveal-from-left">
                  <CardHeader>
                    <CardTitle>
                      {t("vendorLanding.pricing.monthly.title")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-semibold">
                      {formatXaf(monthly, locale)}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {t("vendorLanding.pricing.monthly.description")}
                    </p>
                  </CardContent>
                </Card>

                <Card className="reveal-item reveal-from-right">
                  <CardHeader>
                    <CardTitle>
                      {t("vendorLanding.pricing.yearly.title")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-semibold">
                      {formatXaf(yearly, locale)}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {t("vendorLanding.pricing.yearly.description")}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </section>

      <section id="why-us" className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <ScrollReveal direction="up" delay={60}>
          <h2 className="text-3xl font-semibold tracking-tight">
            {t("vendorLanding.whyUs.title")}
          </h2>
        </ScrollReveal>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <ScrollReveal
              key={item}
              direction={item === 2 ? "up" : item === 1 ? "left" : "right"}
              delay={(item - 1) * 90}
            >
              <Card>
                <CardHeader>
                  <CardTitle>
                    {t(`vendorLanding.whyUs.item${item}.title`)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {t(`vendorLanding.whyUs.item${item}.description`)}
                </CardContent>
              </Card>
            </ScrollReveal>
          ))}
        </div>
      </section>

      <section id="faq" className="border-t border-border/60 bg-muted/20">
        <div className="mx-auto max-w-4xl px-6 py-16 lg:px-8">
          <ScrollReveal direction="right" delay={40}>
            <h2 className="text-3xl font-semibold tracking-tight">
              {t("vendorLanding.faq.title")}
            </h2>
          </ScrollReveal>

          <div ref={faqRef}>
            <Accordion type="single" collapsible className="mt-8">
              {faqs.length > 0
                ? faqs.map((faq, index) => (
                    <AccordionItem
                      key={faq.id}
                      value={faq.id}
                      className={`reveal-item ${index % 2 === 0 ? "reveal-from-left" : "reveal-from-right"}`}
                    >
                      <AccordionTrigger>{faq.question}</AccordionTrigger>
                      <AccordionContent>{faq.answer}</AccordionContent>
                    </AccordionItem>
                  ))
                : [1, 2, 3, 4].map((item) => (
                    <AccordionItem
                      key={item}
                      value={`faq-${item}`}
                      className={`reveal-item ${item % 2 === 0 ? "reveal-from-left" : "reveal-from-right"}`}
                    >
                      <AccordionTrigger>
                        {t(`vendorLanding.faq.item${item}.question`)}
                      </AccordionTrigger>
                      <AccordionContent>
                        {t(`vendorLanding.faq.item${item}.answer`)}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
            </Accordion>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden py-20 md:py-28">
        <div className="absolute inset-0 bg-linear-to-r from-primary/8 via-emerald-500/8 to-amber-500/8" />
        <div className="absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-linear-to-r from-transparent via-emerald-400/50 to-transparent" />
        <div className="relative mx-auto max-w-4xl px-6 text-center lg:px-8">
          <ScrollReveal
            direction="up"
            delay={300}
            className="space-y-6 rounded-4xl border border-border/60 bg-card/60 px-6 py-12 shadow-[0_24px_80px_-48px_rgba(16,185,129,0.55)] backdrop-blur-md md:px-10"
          >
            <Badge className="bg-emerald-500/12 text-emerald-700 dark:text-emerald-300">
              {t("vendorLanding.hero.badge")}
            </Badge>
            <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
              {t("vendorLanding.growthCta.title")}
            </h2>
            <p className="mx-auto max-w-2xl text-base text-muted-foreground md:text-xl">
              {t("vendorLanding.growthCta.subtitle")}
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              {session?.user ? (
                <Link href={dashboardHref}>
                  <Button
                    size="lg"
                    className="group bg-linear-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/20 transition-all duration-300 hover:-translate-y-0.5 hover:from-emerald-600 hover:to-green-700"
                  >
                    {t("vendorLanding.growthCta.ctaDashboard")}
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href={`/${locale}/signup?role=VENDOR`}>
                    <Button
                      size="lg"
                      className="group bg-linear-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/20 transition-all duration-300 hover:-translate-y-0.5 hover:from-emerald-600 hover:to-green-700"
                    >
                      {t("vendorLanding.growthCta.ctaSignup")}
                      <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                    </Button>
                  </Link>
                  <Link href={`/${locale}/login`}>
                    <Button
                      size="lg"
                      variant="outline"
                      className="transition-all duration-300 hover:-translate-y-0.5"
                    >
                      {t("vendorLanding.hero.ctaLogin")}
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </ScrollReveal>
        </div>
      </section>

      <footer className="border-t border-border/50 py-9 lg:py-10 min-[72rem]:py-11 xl:py-12">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-3 min-[72rem]:gap-4 md:flex-row">
            <div className="flex items-center gap-3">
              <Image
                src="/logo/coopenergie-logo-full.png"
                alt={t("branding.appName")}
                width={728}
                height={179}
                className="h-7 w-auto min-[72rem]:h-7.5 xl:h-8"
                loading="lazy"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              &copy; 2026 {t("branding.appName")}.{" "}
              {t("homepage.footerRightsReserved")}
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
