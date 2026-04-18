"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Locale, useTranslations } from "@/lib/translations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Shield, Users, ArrowRight, Sparkles, Globe, Vote } from "lucide-react";

export default function Homepage() {
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const t = useTranslations(locale as Locale);

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

  return (
    <main className="min-h-screen bg-background overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/hero-solar.jpg"
            alt={locale === "fr" ? "Communaute cooperative solaire - panneaux solaires sur les toits d'un village camerounais" : "Solar cooperative community - solar panels on rooftops of a Cameroonian village"}
            fill
            className="object-cover"
            priority
          />
          {/* Green energy brand overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/10 via-transparent to-primary/5" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/95 to-background/70 dark:from-background dark:via-background/90 dark:to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-3xl space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium animate-float">
              <Sparkles className="w-4 h-4" />
              {t("homepage.hero.blockchainPowered")}
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground leading-tight text-balance">
              <span className="text-gradient">{t("homepage.hero.powerOfSun")}</span>
              <br />
              <span className="text-gradient-green">{t("homepage.hero.strengthOfCollective")}</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl text-balance">
              {t("homepage.hero.subtitle")}
            </p>
            
            <div className="flex flex-wrap gap-4 pt-4">
              <Link href={`/${locale}/dashboard`}>
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg btn-glow group text-lg px-8 py-6"
                >
                  {t("homepage.hero.cta")}
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-2 border-primary/50 hover:bg-primary/10 hover:border-primary text-lg px-8 py-6 transition-all duration-300"
              >
                {t("homepage.hero.learnMore")}
              </Button>
            </div>
          </div>
        </div>

        {/* Floating Stats */}
        <div className="absolute bottom-10 right-10 hidden lg:block">
          <div className="glass-dark rounded-2xl p-6 space-y-4 animate-float">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">156+</p>
                <p className="text-sm text-muted-foreground">{t("homepage.stats.activeMembers")}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 md:py-32 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <span className="text-amber-500 font-semibold text-sm uppercase tracking-wider">
                {t("homepage.problem.theChallenge")}
              </span>
              <h2 className="text-3xl md:text-5xl font-bold text-foreground leading-tight">
                {t("homepage.problem.title")}
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {t("homepage.problem.description")}
              </p>
              <div className="grid grid-cols-2 gap-6 pt-4">
                <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20">
                  <p className="text-3xl font-bold text-destructive">45%</p>
                  <p className="text-sm text-muted-foreground">{t("homepage.problem.withoutElectricity")}</p>
                </div>
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <p className="text-3xl font-bold text-amber-500">250k</p>
                  <p className="text-sm text-muted-foreground">{t("homepage.problem.forSolarKit")}</p>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-amber-500/20 to-red-500/20 rounded-3xl blur-2xl" />
              <div className="relative rounded-2xl overflow-hidden shadow-2xl card-hover">
                <Image
                  src="/images/energy-challenge.jpg"
                  alt={locale === "fr" ? "Defis energetiques au Cameroun - pylones electriques au coucher du soleil" : "Energy challenges in Cameroon - power lines at sunset"}
                  width={600}
                  height={400}
                  className="w-full h-80 object-cover"
                  loading="lazy"
                />
                {/* Green energy overlay for brand cohesion */}
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/30 via-transparent to-transparent" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="relative order-last lg:order-first">
              <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/20 to-green-500/20 rounded-3xl blur-2xl" />
              <div className="relative rounded-2xl overflow-hidden shadow-2xl card-hover">
                <Image
                  src="/images/solar-solution.jpg"
                  alt={locale === "fr" ? "Installation de panneaux solaires - energie renouvelable pour les communautes" : "Solar panel installation - renewable energy for communities"}
                  width={600}
                  height={400}
                  className="w-full h-80 object-cover"
                  loading="lazy"
                />
                {/* Green energy overlay for brand cohesion */}
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/20 via-transparent to-transparent" />
              </div>
            </div>
            <div className="space-y-6">
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
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-3xl font-bold text-emerald-500">-40%</p>
                  <p className="text-sm text-muted-foreground">{t("homepage.solution.costSavings")}</p>
                </div>
                <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                  <p className="text-3xl font-bold text-primary">100%</p>
                  <p className="text-sm text-muted-foreground">{t("homepage.solution.transparent")}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 md:py-32 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-primary font-semibold text-sm uppercase tracking-wider">
              {t("homepage.howItWorks.simpleProcess")}
            </span>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mt-4">
              {t("homepage.howItWorks.title")}
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {steps.map((item, index) => (
              <div key={index} className="relative group">
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
                  <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-primary/50 to-transparent" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-primary font-semibold text-sm uppercase tracking-wider">
              {t("homepage.features.whyChooseUs")}
            </span>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mt-4">
              {t("homepage.features.builtForTrust")}
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card 
                  key={index} 
                  className="border-border/50 bg-card/50 backdrop-blur card-hover-glow group overflow-hidden"
                >
                  <CardHeader>
                    <div className={`w-14 h-14 bg-gradient-to-br ${feature.gradient} rounded-xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
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
              );
            })}
          </div>
        </div>
      </section>

      {/* Community Section */}
      <section className="py-20 md:py-32 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
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
                  className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-lg group mt-4"
                >
                  {t("homepage.community.getStarted")}
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-emerald-500/20 rounded-3xl blur-2xl" />
              <div className="relative rounded-2xl overflow-hidden shadow-2xl card-hover">
                <Image
                  src="/images/community-cooperation.jpg"
                  alt={locale === "fr" ? "Cooperation communautaire - village camerounais avec panneaux solaires" : "Community cooperation - Cameroonian village with solar panels"}
                  width={600}
                  height={400}
                  className="w-full h-80 object-cover"
                  loading="lazy"
                />
                {/* Green energy overlay for brand cohesion */}
                <div className="absolute inset-0 bg-gradient-to-t from-primary/20 via-transparent to-transparent" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-amber-500/10 to-emerald-500/10" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
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
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg btn-glow group text-lg px-8 py-6"
              >
                {t("homepage.hero.cta")}
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-foreground">CoopEnergie</span>
            </div>
            <p className="text-sm text-muted-foreground">
              &copy; 2026 CoopEnergie. {locale === "en" ? "All rights reserved." : "Tous droits reserves."}
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
