"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useQuery } from "@apollo/client";
import { Locale, useTranslations } from "@/lib/translations";
import { restClient } from "@/lib/rest-client";
import { GET_MY_COOPERATIVES } from "@/lib/graphql/queries/cooperative";
import {
  GET_MARKETING_VENDORS,
  GET_MONETISATION_SETTINGS,
} from "@/lib/graphql/queries/marketing";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Zap,
  Shield,
  Users,
  ArrowRight,
  Sparkles,
  Globe,
  Vote,
  Eye,
  Target,
  Store,
} from "lucide-react";
import { ScrollReveal } from "@/components/shared/ScrollReveal";
import { useScrollRevealGroup } from "@/lib/hooks/use-scroll-reveal-group";

export const PAGE_TYPE = "customer" as const;

type CooperativeQueryResult = {
  myCooperatives: Array<{
    id: string;
    name: string;
  }>;
};

type VendorQueryResult = {
  vendors: Array<{
    id: string;
    businessName: string;
    description?: string;
    logoUrl?: string;
    rankScore?: number;
    products?: Array<{
      id: string;
      title: string;
    }>;
  }>;
};

type MonetisationSettings = {
  monetisationSettings: {
    withdrawalFeePercent: number;
  };
};

type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

type PendingProposal = {
  vendorId: string;
  vendorName: string;
  productId: string;
  productTitle: string;
};

export default function Homepage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params.locale as string) || "en";
  const t = useTranslations(locale as Locale);
  const { data: session } = useSession();

  const { data: vendorsData } = useQuery<VendorQueryResult>(
    GET_MARKETING_VENDORS,
  );
  const { data: myCooperativesData } = useQuery<CooperativeQueryResult>(
    GET_MY_COOPERATIVES,
    {
      skip: !session?.user,
    },
  );
  const { data: monetisationData } = useQuery<MonetisationSettings>(
    GET_MONETISATION_SETTINGS,
  );
  const withdrawalFeePercent =
    monetisationData?.monetisationSettings?.withdrawalFeePercent ?? 0;

  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  useEffect(() => {
    restClient
      .get<FaqItem[]>(`/faq?audience=CUSTOMER&locale=${locale}`)
      .then(setFaqs)
      .catch(() => {});
  }, [locale]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingProposal, setPendingProposal] =
    useState<PendingProposal | null>(null);
  const [selectedCooperativeId, setSelectedCooperativeId] =
    useState<string>("");
  const [proposalMessage, setProposalMessage] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const howItWorksRef = useRef<HTMLDivElement>(null);
  const impactStatsRef = useRef<HTMLDivElement>(null);
  const faqRef = useRef<HTMLDivElement>(null);

  useScrollRevealGroup(howItWorksRef, ".reveal-item", {
    initialDelayMs: 70,
    staggerMs: 100,
    threshold: 0.2,
  });
  useScrollRevealGroup(impactStatsRef, ".reveal-item", {
    initialDelayMs: 40,
    staggerMs: 110,
    threshold: 0.2,
  });
  useScrollRevealGroup(faqRef, ".reveal-item", {
    initialDelayMs: 60,
    staggerMs: 90,
    threshold: 0.18,
  });

  const features = [
    {
      icon: Shield,
      title: t("homepage.transparency.title"),
      description: t("homepage.transparency.description"),
      gradient: "from-amber-400 to-orange-500",
    },
    {
      icon: Users,
      title: t("homepage.features.collectivePower"),
      description: t("homepage.features.collectivePowerDesc"),
      gradient: "from-emerald-400 to-green-500",
    },
    {
      icon: Vote,
      title: t("homepage.features.democraticVoting"),
      description: t("homepage.features.democraticVotingDesc"),
      gradient: "from-blue-400 to-indigo-500",
    },
  ];

  const steps = [
    {
      step: "01",
      title: t("homepage.howItWorks.step1Title"),
      description: t("homepage.howItWorks.step1Desc"),
    },
    {
      step: "02",
      title: t("homepage.howItWorks.step2Title"),
      description: t("homepage.howItWorks.step2Desc"),
    },
    {
      step: "03",
      title: t("homepage.howItWorks.step3Title"),
      description: t("homepage.howItWorks.step3Desc"),
    },
    {
      step: "04",
      title: t("homepage.howItWorks.step4Title"),
      description: t("homepage.howItWorks.step4Desc"),
    },
  ];

  const vendors = useMemo(() => vendorsData?.vendors ?? [], [vendorsData]);
  const marqueeItems = useMemo(() => [...vendors, ...vendors], [vendors]);
  const myCooperatives = myCooperativesData?.myCooperatives ?? [];

  const openProposeDialog = (proposal: PendingProposal) => {
    if (!session?.user) {
      setProposalMessage(t("vendorLanding.cta.loginRequired"));
      router.push(`/${locale}/login`);
      return;
    }

    setPendingProposal(proposal);
    setSelectedCooperativeId(myCooperatives[0]?.id ?? "");
    setProposalMessage("");
    setDialogOpen(true);
  };

  const submitProposal = async () => {
    if (!pendingProposal || !selectedCooperativeId) {
      setProposalMessage(t("vendorLanding.cta.selectCooperative"));
      return;
    }

    try {
      setSubmitting(true);
      setProposalMessage("");

      await restClient.post<{ id: string }>("/proposals", {
        cooperativeId: selectedCooperativeId,
        title: `Achat groupé: ${pendingProposal.vendorName} - ${pendingProposal.productTitle}`,
        description: `Proposition d'achat groupé d'équipement solaire (${pendingProposal.productTitle}) auprès du fournisseur ${pendingProposal.vendorName}.`,
        vendorId: pendingProposal.vendorId,
        productId: pendingProposal.productId,
        vendorNote: "Proposition soumise depuis la vitrine fournisseurs.",
      });

      setDialogOpen(false);
      setPendingProposal(null);
      setProposalMessage(t("vendorLanding.cta.proposalCreated"));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t("vendorLanding.cta.proposalFailed");
      setProposalMessage(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-background overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/hero-solar.jpg"
            alt={t("homepage.hero.heroAlt")}
            fill
            className="object-cover"
            priority
          />
          {/* Green energy brand overlay */}
          <div className="absolute inset-0 bg-linear-to-br from-emerald-900/10 via-transparent to-primary/5" />
          <div className="absolute inset-0 bg-linear-to-r from-background via-background/95 to-background/70 dark:from-background dark:via-background/90 dark:to-transparent" />
          <div className="absolute inset-0 bg-linear-to-t from-background via-transparent to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <ScrollReveal
            direction="up"
            delay={220}
            threshold={0.22}
            className="max-w-3xl space-y-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium animate-float">
              <Sparkles className="w-4 h-4" />
              {t("homepage.hero.blockchainPowered")}
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground leading-tight text-balance">
              <span className="text-gradient">
                {t("homepage.hero.powerOfSun")}
              </span>
              <br />
              <span className="text-gradient-green">
                {t("homepage.hero.strengthOfCollective")}
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl text-balance">
              {t("homepage.hero.subtitle")}
            </p>

            <div className="flex flex-wrap gap-4 pt-4">
              <Link href={`/${locale}/signup`}>
                <Button
                  size="lg"
                  className="bg-linear-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-lg btn-glow group text-lg px-8 py-6"
                >
                  {t("homepage.hero.cta")}
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              {/*<Button
                size="lg"
                variant="outline"
                className="border-2 border-primary/50 hover:bg-primary/10 hover:border-primary text-lg px-8 py-6 transition-all duration-300"
              >
                {t("homepage.hero.learnMore")}
              </Button>*/}
            </div>
          </ScrollReveal>
        </div>

        {/* Floating Stats */}
        <div className="absolute bottom-10 right-10 hidden lg:block">
          <ScrollReveal
            direction="right"
            delay={420}
            threshold={0.2}
            className="glass-dark rounded-2xl p-6 space-y-4 animate-float"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-linear-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">156+</p>
                <p className="text-sm text-muted-foreground">
                  {t("homepage.stats.activeMembers")}
                </p>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Vision-Mission Section */}
      <section
        id="approach"
        className="py-24 bg-nuit-dark relative overflow-hidden border-t border-white/5"
      >
        {/* Subtle background glow */}
        <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-soleil/5 rounded-full blur-[120px] -translate-y-1/2 pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <ScrollReveal direction="left" delay={40}>
              <div className="glass-dark p-10 rounded-3xl relative overflow-hidden group hover:-translate-y-2 transition-all duration-300 border border-white/10 hover:border-soleil/30 shadow-2xl shadow-black/50">
                <div className="absolute -top-10 -right-10 opacity-5 group-hover:opacity-10 transition-opacity duration-500 blur-sm">
                  <Eye className="h-48 w-48 text-soleil" />
                </div>
                <div className="relative z-10">
                  <div className="bg-white/5 w-16 h-16 rounded-2xl flex items-center justify-center mb-8 border border-white/10 group-hover:bg-soleil/10 transition-colors duration-300">
                    <Eye className="h-8 w-8 text-soleil" />
                  </div>
                  <h2 className="text-3xl md:text-5xl font-bold text-foreground leading-tight">
                    {t("vision_title")}
                  </h2>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    {t("vision_desc")}
                  </p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="right" delay={120}>
              <div className="glass-dark p-10 rounded-3xl relative overflow-hidden group hover:-translate-y-2 transition-all duration-300 border border-white/10 hover:border-soleil/30 shadow-2xl shadow-black/50">
                <div className="absolute -top-10 -right-10 opacity-5 group-hover:opacity-10 transition-opacity duration-500 blur-sm">
                  <Target className="h-48 w-48 text-soleil" />
                </div>
                <div className="relative z-10">
                  <div className="bg-white/5 w-16 h-16 rounded-2xl flex items-center justify-center mb-8 border border-white/10 group-hover:bg-soleil/10 transition-colors duration-300">
                    <Target className="h-8 w-8 text-soleil" />
                  </div>
                  <h2 className="text-3xl md:text-5xl font-bold text-foreground leading-tight">
                    {t("mission_title")}
                  </h2>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    {t("mission_desc")}
                  </p>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section id="problem" className="py-20 md:py-32 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <ScrollReveal direction="left" delay={40} className="space-y-6">
              <span className="text-amber-500 font-semibold text-sm uppercase tracking-wider">
                {t("homepage.problem.theChallenge")}
              </span>
              <h2 className="text-3xl md:text-5xl font-bold text-foreground leading-tight">
                {t("homepage.problem.title")}
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {t("homepage.problem.description")}
              </p>
              <div ref={impactStatsRef} className="grid grid-cols-2 gap-6 pt-4">
                <div className="reveal-item reveal-from-down p-4 rounded-xl bg-destructive/10 border border-destructive/20">
                  <p className="text-3xl font-bold text-destructive">45%</p>
                  <p className="text-sm text-muted-foreground">
                    {t("homepage.problem.withoutElectricity")}
                  </p>
                </div>
                <div className="reveal-item reveal-from-down p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <p className="text-3xl font-bold text-amber-500">
                    60k - 250k
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("homepage.problem.forSolarKit")}
                  </p>
                </div>
              </div>
            </ScrollReveal>
            <ScrollReveal direction="right" delay={110} className="relative">
              <div className="absolute -inset-4 bg-linear-to-r from-amber-500/20 to-red-500/20 rounded-3xl blur-2xl" />
              <div className="relative rounded-2xl overflow-hidden shadow-2xl card-hover">
                <Image
                  src="/images/energy-challenge.jpg"
                  alt={t("homepage.problem.imageAlt")}
                  width={600}
                  height={400}
                  className="w-full h-80 object-cover"
                  loading="lazy"
                />
                {/* Green energy overlay for brand cohesion */}
                <div className="absolute inset-0 bg-linear-to-t from-emerald-900/30 via-transparent to-transparent" />
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section id="solution" className="py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <ScrollReveal
              direction="left"
              className="relative order-last lg:order-first"
            >
              <div className="absolute -inset-4 bg-linear-to-r from-emerald-500/20 to-green-500/20 rounded-3xl blur-2xl" />
              <div className="relative rounded-2xl overflow-hidden shadow-2xl card-hover">
                <Image
                  src="/images/solar-solution.jpg"
                  alt={t("homepage.solution.imageAlt")}
                  width={600}
                  height={400}
                  className="w-full h-80 object-cover"
                  loading="lazy"
                />
                {/* Green energy overlay for brand cohesion */}
                <div className="absolute inset-0 bg-linear-to-t from-emerald-900/20 via-transparent to-transparent" />
              </div>
            </ScrollReveal>
            <ScrollReveal direction="right" className="space-y-6">
              <span className="text-emerald-500 font-semibold text-sm uppercase tracking-wider">
                {t("homepage.solution.ourSolution")}
              </span>
              <h2 className="text-3xl md:text-5xl font-bold text-foreground leading-tight">
                {t("homepage.solution.title")}
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {t("homepage.solution.description")}
              </p>
              <div className="grid grid-cols-2 gap-6 pt-4">
                <div className="reveal-item reveal-from-down p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-3xl font-bold text-emerald-500">-40%</p>
                  <p className="text-sm text-muted-foreground">
                    {t("homepage.solution.costSavings")}
                  </p>
                </div>
                <div className="reveal-item reveal-from-down p-4 rounded-xl bg-primary/10 border border-primary/20">
                  <p className="text-3xl font-bold text-primary">100%</p>
                  <p className="text-sm text-muted-foreground">
                    {t("homepage.solution.transparent")}
                  </p>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 md:py-32 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal direction="up" delay={40} className="text-center mb-16">
            <span className="text-primary font-semibold text-sm uppercase tracking-wider">
              {t("homepage.howItWorks.simpleProcess")}
            </span>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mt-4">
              {t("homepage.howItWorks.title")}
            </h2>
          </ScrollReveal>

          <div ref={howItWorksRef} className="grid md:grid-cols-4 gap-8">
            {steps.map((item, index) => (
              <div
                key={index}
                className={`reveal-item relative group ${index % 3 === 0 ? "reveal-from-left" : index % 3 === 1 ? "reveal-from-up" : "reveal-from-right"}`}
              >
                <Card className="h-full border-border/50 bg-card/50 backdrop-blur card-hover hover:border-primary/50">
                  <CardHeader>
                    <span className="text-5xl font-bold text-primary/20 group-hover:text-primary/40 transition-colors">
                      {item.step}
                    </span>
                    <CardTitle className="text-xl mt-2">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{item.description}</p>
                  </CardContent>
                </Card>
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-linear-to-r from-primary/50 to-transparent" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="platform-vendors"
        className="border-y border-border/60 bg-background py-16 md:py-20"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal direction="left" delay={40}>
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <Badge className="mb-2 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                  {t("vendorLanding.customerSection.badge")}
                </Badge>
                <h2 className="text-3xl font-semibold tracking-tight">
                  {t("vendorLanding.customerSection.title")}
                </h2>
                <p className="mt-2 max-w-2xl text-muted-foreground">
                  {t("vendorLanding.customerSection.subtitle")}
                </p>
              </div>
              {/*<Link href={`/${locale}/vendors`}>
              <Button variant="outline">
                {t("vendorLanding.customerSection.exploreAll")}
              </Button>
            </Link>*/}
            </div>
          </ScrollReveal>

          {vendors.length === 0 ? (
            <ScrollReveal direction="up" delay={70}>
              <div className="rounded-xl border border-dashed border-border/80 p-6 text-sm text-muted-foreground">
                {t("vendorLanding.customerSection.empty")}
              </div>
            </ScrollReveal>
          ) : (
            <ScrollReveal direction="right" delay={90}>
              <div className="relative overflow-hidden">
                <div className="vendor-marquee flex w-max gap-4 py-2">
                  {marqueeItems.map((vendor, index) => {
                    const product = vendor.products?.[0];
                    return (
                      <Card
                        key={`${vendor.id}-${index}`}
                        className="w-[320px] shrink-0 border-border/60 bg-card/70 backdrop-blur"
                      >
                        <CardHeader>
                          <div className="mb-3 flex items-center gap-3">
                            {vendor.logoUrl ? (
                              <Image
                                src={vendor.logoUrl}
                                alt={vendor.businessName}
                                width={44}
                                height={44}
                                className="h-11 w-11 rounded-full object-cover"
                              />
                            ) : (
                              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-700 dark:text-emerald-300">
                                <Store className="h-5 w-5" />
                              </div>
                            )}
                            <div>
                              <CardTitle className="line-clamp-1 text-base">
                                {vendor.businessName}
                              </CardTitle>
                              {vendor.rankScore ? (
                                <p className="text-xs text-muted-foreground">
                                  Score {vendor.rankScore.toFixed(1)}
                                </p>
                              ) : null}
                            </div>
                          </div>
                          <p className="line-clamp-2 text-sm text-muted-foreground">
                            {vendor.description ||
                              t(
                                "vendorLanding.customerSection.defaultDescription",
                              )}
                          </p>
                        </CardHeader>
                        <CardContent>
                          <p className="mb-3 line-clamp-1 text-sm font-medium text-foreground">
                            {product?.title ||
                              t("vendorLanding.customerSection.noProduct")}
                          </p>
                          <Button
                            className="w-full"
                            variant="secondary"
                            onClick={() =>
                              openProposeDialog({
                                vendorId: vendor.id,
                                vendorName: vendor.businessName,
                                productId: product?.id || "",
                                productTitle:
                                  product?.title || "Produit solaire",
                              })
                            }
                            disabled={!product?.id}
                          >
                            {t("vendorLanding.customerSection.proposeToCoop")}
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </ScrollReveal>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section id="transparency" className="py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal
            direction="left"
            delay={40}
            className="text-center mb-16"
          >
            <span className="text-primary font-semibold text-sm uppercase tracking-wider">
              {t("homepage.features.whyChooseUs")}
            </span>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mt-4">
              {t("homepage.features.builtForTrust")}
            </h2>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <ScrollReveal
                  key={index}
                  direction={
                    index === 0 ? "left" : index === 1 ? "up" : "right"
                  }
                  delay={index * 90}
                >
                  <Card className="border-border/50 bg-card/50 backdrop-blur card-hover-glow group overflow-hidden">
                    <CardHeader>
                      <div
                        className={`w-14 h-14 bg-linear-to-br ${feature.gradient} rounded-xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}
                      >
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                      <CardTitle className="text-xl group-hover:text-primary transition-colors">
                        {feature.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground leading-relaxed">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Community Section */}
      <section id="impact" className="py-20 md:py-32 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <ScrollReveal direction="left" delay={40} className="space-y-6">
              <span className="text-primary font-semibold text-sm uppercase tracking-wider">
                {t("homepage.community.joinTheMovement")}
              </span>
              <h2 className="text-3xl md:text-5xl font-bold text-foreground leading-tight">
                {t("homepage.community.powerYourCommunity")}
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {t("homepage.community.description")}
              </p>
              <Link href={`/${locale}/dashboard`}>
                <Button
                  size="lg"
                  className="bg-linear-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-lg group mt-4"
                >
                  {t("homepage.community.getStarted")}
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </ScrollReveal>
            <ScrollReveal direction="right" delay={110} className="relative">
              <div className="absolute -inset-4 bg-linear-to-r from-primary/20 to-emerald-500/20 rounded-3xl blur-2xl" />
              <div className="relative rounded-2xl overflow-hidden shadow-2xl card-hover">
                <Image
                  src="/images/community-cooperation.jpg"
                  alt={t("homepage.community.imageAlt")}
                  width={600}
                  height={400}
                  className="w-full h-80 object-cover"
                  loading="lazy"
                />
                {/* Green energy overlay for brand cohesion */}
                <div className="absolute inset-0 bg-linear-to-t from-primary/20 via-transparent to-transparent" />
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <section id="faq" className="border-y border-border/60 bg-muted/20 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal direction="right" delay={40}>
            <h2 className="text-3xl font-semibold tracking-tight">
              {t("vendorLanding.customerFaq.title")}
            </h2>
          </ScrollReveal>

          {withdrawalFeePercent > 0 && (
            <ScrollReveal direction="left" delay={60}>
              <p className="mt-4 text-sm text-muted-foreground">
                {t("vendorLanding.pricing.withdrawalFeePrefix")}{" "}
                {withdrawalFeePercent}%{" "}
                {t("vendorLanding.pricing.withdrawalFeeSuffix")}
              </p>
            </ScrollReveal>
          )}

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
                      value={`customer-faq-${item}`}
                      className={`reveal-item ${item % 2 === 0 ? "reveal-from-left" : "reveal-from-right"}`}
                    >
                      <AccordionTrigger>
                        {t(`vendorLanding.customerFaq.item${item}.question`)}
                      </AccordionTrigger>
                      <AccordionContent>
                        {t(`vendorLanding.customerFaq.item${item}.answer`)}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-r from-primary/10 via-amber-500/10 to-emerald-500/10" />
        <ScrollReveal
          direction="up"
          delay={320}
          className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-foreground">
            {t("homepage.cta.readyToLight")}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("homepage.cta.joinToday")}
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Link href={`/${locale}/dashboard`}>
              <Button
                size="lg"
                className="bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg btn-glow group text-lg px-8 py-6"
              >
                {t("homepage.hero.cta")}
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </ScrollReveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-9 lg:py-10 min-[72rem]:py-11 xl:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-3 min-[72rem]:gap-4">
            <div className="flex items-center gap-2">
              <Link
                href={`/${locale}`}
                className="flex items-center gap-2.5 md:gap-3 group"
              >
                <Image
                  src="/logo/coopenergie-logo-full.png"
                  alt={t("navbar.logo")}
                  width={20}
                  height={20}
                  priority
                  className="h-7 w-auto md:h-7.5 xl:h-8 transition-all duration-300 group-hover:opacity-90 drop-shadow-[0_1px_0_rgba(15,23,42,0.08)] dark:drop-shadow-[0_1px_0_rgba(248,250,252,0.12)]"
                />
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              &copy; 2026 {t("branding.appName")}.{" "}
              {t("homepage.footerRightsReserved")}
            </p>
          </div>
        </div>
      </footer>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("vendorLanding.cta.dialogTitle")}</DialogTitle>
            <DialogDescription>
              {pendingProposal
                ? `${pendingProposal.vendorName} - ${pendingProposal.productTitle}`
                : t("vendorLanding.cta.dialogDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Select
              value={selectedCooperativeId}
              onValueChange={setSelectedCooperativeId}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={t("vendorLanding.cta.selectPlaceholder")}
                />
              </SelectTrigger>
              <SelectContent>
                {myCooperatives.map((coop) => (
                  <SelectItem key={coop.id} value={coop.id}>
                    {coop.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!myCooperatives.length ? (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                {t("vendorLanding.cta.noCooperative")}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("vendorLanding.cta.cancel")}
            </Button>
            <Button
              onClick={submitProposal}
              disabled={submitting || !myCooperatives.length}
            >
              {submitting
                ? t("vendorLanding.cta.submitting")
                : t("vendorLanding.cta.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {proposalMessage ? (
        <div className="fixed right-4 bottom-4 z-50 max-w-sm rounded-lg border border-border bg-background p-3 text-sm shadow-xl">
          {proposalMessage}
        </div>
      ) : null}

      <style jsx>{`
        .vendor-marquee {
          animation: vendor-marquee 40s linear infinite;
        }

        .vendor-marquee:hover {
          animation-play-state: paused;
        }

        @keyframes vendor-marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </main>
  );
}
