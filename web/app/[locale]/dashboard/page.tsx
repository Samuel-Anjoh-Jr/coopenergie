"use client";

import { useParams } from "next/navigation";
import { Locale, useTranslations } from "@/lib/translations";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, DollarSign, Users, MessageSquare, CheckCircle, ArrowRight, Sun, Lightbulb, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const t = useTranslations(locale as Locale);
  const { currentUser } = useAuth();

  // Mock cooperative data - Realistic Douala solar project
  const cooperative = {
    name: locale === "fr" ? "Solaire Communautaire Douala" : "Solar Communities Douala",
    targetAmount: 8500000, // Cost for 50 solar panels across 25 households
    totalCollected: 3750000,
    members: 156,
    households: 25,
  };

  const remainingAmount = cooperative.targetAmount - cooperative.totalCollected;
  const progressPercent = (cooperative.totalCollected / cooperative.targetAmount) * 100;

  // Mock metrics
  const metrics = [
    {
      title: t("dashboard.totalContributions"),
      value: "3 750 000 FCFA",
      icon: DollarSign,
    },
    {
      title: t("dashboard.members"),
      value: "156",
      icon: Users,
    },
    {
      title: t("dashboard.activeProposals"),
      value: "5",
      icon: Zap,
    },
  ];

  // Mock recent activity - personalized to current user with realistic Cameroonian names
  const recentActivity = [
    {
      type: "contribution",
      user: currentUser?.name || "Jean-Baptiste Akogo",
      action: t("dashboard.contribution"),
      amount: "500 000 FCFA",
      timestamp: locale === "en" ? "2 hours ago" : "Il y a 2 heures",
    },
    {
      type: "vote",
      user: "Marie-Claire Ndoumbe",
      action: `${t("dashboard.vote")} - ${t("dashboard.votedOn")} ${locale === "fr" ? "Installation solaire Bonaberi" : "Bonaberi Solar Installation"}`,
      timestamp: locale === "en" ? "5 hours ago" : "Il y a 5 heures",
    },
    {
      type: "proposal",
      user: "Pierre Essomba Mbida",
      action: t("dashboard.proposalCreated"),
      description: locale === "en" ? "Battery storage for night power" : "Stockage batterie pour l'electricite nocturne",
      timestamp: locale === "en" ? "1 day ago" : "Il y a 1 jour",
    },
    {
      type: "contribution",
      user: "Amara Oumarou Diallo",
      action: t("dashboard.contribution"),
      amount: "1 200 000 FCFA",
      timestamp: locale === "en" ? "2 days ago" : "Il y a 2 jours",
    },
    {
      type: "vote",
      user: "Sophie Ngo Ebonji",
      action: `${t("dashboard.vote")} - ${t("dashboard.votedOn")} ${locale === "fr" ? "Atelier de formation" : "Training Workshop"}`,
      timestamp: locale === "en" ? "3 days ago" : "Il y a 3 jours",
    },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "contribution":
        return <DollarSign className="w-4 h-4" />;
      case "vote":
        return <CheckCircle className="w-4 h-4" />;
      case "proposal":
        return <MessageSquare className="w-4 h-4" />;
      default:
        return <Zap className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Demo Scenario Banner */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-500/30 p-4 md:p-5">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-500/20 to-transparent rounded-full blur-2xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-lg">
              <Sun className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30 text-xs">
                  <Sparkles className="w-3 h-3 mr-1" />
                  {t("demo.liveDemo")}
                </Badge>
              </div>
              <h3 className="font-semibold text-foreground text-sm md:text-base mt-1">
                {t("demo.scenarioBanner")}
              </h3>
            </div>
          </div>
          <p className="text-sm text-muted-foreground flex-1 sm:text-right">
            {t("demo.scenarioDescription")}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          {t("dashboard.welcome")}
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          {t("dashboard.welcomeDesc")}
        </p>
      </div>

      {/* Cooperative Summary Card */}
      <Card className="border-border/50 bg-gradient-to-br from-card via-card to-primary/5 overflow-hidden relative card-hover-glow">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-amber-500/10 to-transparent rounded-full blur-3xl" />
        <CardHeader className="p-4 md:p-6 pb-2 md:pb-4 relative">
          <CardTitle className="text-xl md:text-2xl">{t("dashboard.cooperativeSummary")}</CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0 space-y-4 md:space-y-6 relative">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
            <div className="p-3 md:p-4 rounded-xl bg-muted/50 border border-border/50 transition-all duration-300 hover:border-primary/30 hover:bg-primary/5">
              <p className="text-xs md:text-sm text-muted-foreground font-medium uppercase tracking-wide">
                {t("dashboard.cooperativeName")}
              </p>
              <p className="text-lg md:text-2xl font-bold text-foreground mt-1">
                {cooperative.name}
              </p>
            </div>
            <div className="p-3 md:p-4 rounded-xl bg-muted/50 border border-border/50 transition-all duration-300 hover:border-primary/30 hover:bg-primary/5">
              <p className="text-xs md:text-sm text-muted-foreground font-medium uppercase tracking-wide">
                {t("dashboard.members")}
              </p>
              <p className="text-lg md:text-2xl font-bold text-gradient-green mt-1">
                {cooperative.members}
              </p>
            </div>
          </div>

          {/* Progress Section - Highlighted as key feature */}
          <div className="space-y-3 p-3 md:p-4 rounded-xl bg-muted/30 border-2 border-primary/40 relative ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground font-medium uppercase tracking-wide">
                  {t("dashboard.targetAmount")}
                </p>
                <p className="text-base md:text-lg font-semibold text-foreground">
                  {cooperative.targetAmount.toLocaleString()} FCFA
                </p>
              </div>
              <div className="sm:text-right">
                <p className="text-xs md:text-sm text-muted-foreground font-medium uppercase tracking-wide">
                  {t("dashboard.remainingAmount")}
                </p>
                <p className="text-base md:text-lg font-semibold text-gradient">
                  {remainingAmount.toLocaleString()} FCFA
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">{t("dashboard.progress")}</p>
                <p className="text-sm font-bold text-primary">{Math.round(progressPercent)}%</p>
              </div>
              <div className="w-full h-3 md:h-4 bg-muted rounded-full overflow-hidden shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-green-500 to-amber-500 rounded-full transition-all duration-700 shadow-lg"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{t("dashboard.totalCollected")}: {cooperative.totalCollected.toLocaleString()} FCFA</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          const gradients = [
            "from-emerald-500 to-green-600",
            "from-amber-500 to-orange-600",
            "from-blue-500 to-indigo-600",
          ];
          return (
            <Card key={metric.title} className="border-border/50 bg-card/50 backdrop-blur card-hover group overflow-hidden relative">
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${gradients[index]} opacity-10 rounded-full blur-2xl group-hover:opacity-20 transition-opacity`} />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 md:p-6 pb-2 relative">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                  {metric.title}
                </CardTitle>
                <div className={`w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br ${gradients[index]} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
              </CardHeader>
              <CardContent className="relative p-4 md:p-6 pt-0">
                <div className="text-2xl md:text-3xl font-bold text-foreground">
                  {metric.value}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Activity */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="flex flex-row items-center justify-between p-4 md:p-6">
          <CardTitle className="text-lg md:text-xl">{t("dashboard.recentActivity")}</CardTitle>
          <button className="text-sm font-medium text-primary hover:text-accent transition-all duration-300 flex items-center gap-1 hover:gap-2 min-h-[44px]">
            {t("dashboard.viewAll")} <ArrowRight className="w-4 h-4" />
          </button>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0">
          <div className="space-y-2">
            {recentActivity.map((activity, index) => (
              <div
                key={index}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 md:py-4 px-3 md:px-4 hover:bg-primary/5 rounded-xl transition-all duration-300 border border-transparent hover:border-primary/20 group gap-2 sm:gap-0"
              >
                <div className="flex items-start gap-3 md:gap-4 flex-1">
                  <div className={`w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 transition-all duration-300 group-hover:scale-110 ${
                    activity.type === "contribution" 
                      ? "bg-gradient-to-br from-emerald-500 to-green-600 text-white" 
                      : activity.type === "vote"
                      ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white"
                      : "bg-gradient-to-br from-amber-500 to-orange-600 text-white"
                  }`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm md:text-base text-foreground group-hover:text-primary transition-colors">
                      {activity.user}
                    </p>
                    <p className="text-xs md:text-sm text-muted-foreground truncate">
                      {activity.action}
                      {activity.description && ` - ${activity.description}`}
                    </p>
                  </div>
                </div>
                <div className="text-left sm:text-right flex-shrink-0 pl-12 sm:pl-0">
                  {activity.amount && (
                    <p className="font-semibold text-sm md:text-base text-gradient-green">
                      {activity.amount}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {activity.timestamp}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
