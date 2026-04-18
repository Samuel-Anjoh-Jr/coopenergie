"use client";

import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import { Locale, useTranslations } from "@/lib/translations";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Plus, Calendar, User as UserIcon, Coins, CheckCircle, Lightbulb, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface Contribution {
  id: number;
  user: string;
  amount: number;
  date: string;
  status: "Active" | "Pending";
  isNew?: boolean;
}

export default function ContributionsPage() {
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const t = useTranslations(locale as Locale);
  const { currentUser } = useAuth();
  const listRef = useRef<HTMLDivElement>(null);

  const [contributions, setContributions] = useState<Contribution[]>([
    {
      id: 1,
      user: "Jean-Baptiste Akogo",
      amount: 500000,
      date: "2024-03-15",
      status: "Active",
    },
    {
      id: 2,
      user: "Marie-Claire Ndoumbe",
      amount: 750000,
      date: "2024-03-12",
      status: "Active",
    },
    {
      id: 3,
      user: "Pierre Essomba Mbida",
      amount: 325000,
      date: "2024-03-10",
      status: "Active",
    },
    {
      id: 4,
      user: "Amara Oumarou Diallo",
      amount: 1200000,
      date: "2024-03-08",
      status: "Active",
    },
    {
      id: 5,
      user: "Sophie Ngo Ebonji",
      amount: 450000,
      date: "2024-03-05",
      status: "Active",
    },
    {
      id: 6,
      user: "Charles Kamga Fotso",
      amount: 525000,
      date: "2024-03-01",
      status: "Pending",
    },
  ]);

  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [amount, setAmount] = useState("");
  const [totalCollected, setTotalCollected] = useState(3750000);
  const [animatingProgress, setAnimatingProgress] = useState(false);
  const targetAmount = 5000000;

  // Calculate progress percentage
  const progressPercent = (totalCollected / targetAmount) * 100;

  const handleAddContribution = () => {
    if (amount && currentUser) {
      setIsLoading(true);
      
      // Simulate API call
      setTimeout(() => {
        const contributionAmount = parseFloat(amount);
        const newContribution: Contribution = {
          id: Math.max(...contributions.map(c => c.id), 0) + 1,
          user: currentUser.name,
          amount: contributionAmount,
          date: new Date().toISOString().split("T")[0],
          status: "Active",
          isNew: true,
        };

        // Show success state
        setShowSuccess(true);
        setIsLoading(false);

        setTimeout(() => {
          setShowSuccess(false);
          setIsOpen(false);
          
          // Add new contribution to list
          setContributions([newContribution, ...contributions]);
          
          // Animate progress bar increase
          setAnimatingProgress(true);
          const previousTotal = totalCollected;
          setTotalCollected(prev => prev + contributionAmount);
          
          // Scroll to top smoothly
          setTimeout(() => {
            listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 100);
          
          // Reset animation state
          setTimeout(() => {
            setAnimatingProgress(false);
          }, 1000);
          
          // Remove "new" flag after animation
          setTimeout(() => {
            setContributions(prev => 
              prev.map(c => ({ ...c, isNew: false }))
            );
          }, 2500);
          
          setAmount("");
          
          // Show personalized toast
          toast.success(
            `${t("toasts.youContributed")} ${contributionAmount.toLocaleString()} FCFA`,
            {
              description: locale === "en" 
                ? "Your contribution has been recorded on the ledger" 
                : "Votre contribution a ete enregistree sur le grand livre",
            }
          );
        }, 600);
      }, 750);
    }
  };

  const getStatusLabel = (status: string) => {
    if (status === "Active") {
      return locale === "en" ? "Active" : "Actif";
    }
    return locale === "en" ? "Pending" : "En attente";
  };

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            {t("contributions.title")}
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {t("contributions.description")}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <Button
            onClick={() => setIsOpen(true)}
            className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-lg btn-glow w-full sm:w-fit group min-h-[44px] active:animate-button-press ring-2 ring-primary/30 ring-offset-2 ring-offset-background"
          >
            <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform duration-300" />
            {t("contributions.addContribution")}
          </Button>
          {/* Guided Hint */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm animate-pulse">
            <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <span className="text-amber-700 dark:text-amber-300">
              {t("demo.hintContribution")}
            </span>
            <ArrowRight className="w-4 h-4 text-amber-500 hidden sm:block" />
          </div>
        </div>
      </div>

      {/* Progress Summary Card */}
      <Card className="border-border/50 bg-gradient-to-br from-card via-card to-primary/5 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-3xl" />
        <CardContent className="p-4 md:p-6 relative">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                {locale === "en" ? "Total Collected" : "Total collecte"}
              </span>
              <span className="text-lg font-bold text-gradient-green">
                {totalCollected.toLocaleString()} FCFA
              </span>
            </div>
            <div className="w-full h-3 md:h-4 bg-muted rounded-full overflow-hidden shadow-inner">
              <div
                className={`h-full bg-gradient-to-r from-emerald-500 via-green-500 to-amber-500 rounded-full shadow-lg transition-all ${
                  animatingProgress ? "duration-1000" : "duration-300"
                }`}
                style={{ 
                  width: `${progressPercent}%`,
                }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{Math.round(progressPercent)}% {locale === "en" ? "complete" : "complete"}</span>
              <span>{locale === "en" ? "Goal" : "Objectif"}: {targetAmount.toLocaleString()} FCFA</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div ref={listRef}>
        <Card className="border-border/50 bg-card/50 backdrop-blur overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-3xl" />
          <CardHeader className="relative p-4 md:p-6">
            <CardTitle className="text-lg md:text-xl">{t("contributions.title")}</CardTitle>
          </CardHeader>
          <CardContent className="relative p-4 md:p-6 pt-0">
            {contributions.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                {t("contributions.noContributions")}
              </p>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/50 hover:bg-transparent">
                        <TableHead>{t("contributions.user")}</TableHead>
                        <TableHead>{t("contributions.amount")}</TableHead>
                        <TableHead>{t("contributions.date")}</TableHead>
                        <TableHead>{t("contributions.status")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contributions.map((contribution) => (
                        <TableRow 
                          key={contribution.id} 
                          className={`border-border/50 transition-all duration-300 hover:bg-primary/5 hover:translate-x-1 group ${
                            contribution.isNew ? "animate-highlight animate-slide-in-top" : ""
                          }`}
                        >
                          <TableCell className="font-medium group-hover:text-primary transition-colors">
                            <div className="flex items-center gap-2">
                              {contribution.user}
                              {contribution.isNew && (
                                <Badge className="bg-primary/20 text-primary text-xs animate-pulse">
                                  {locale === "en" ? "New" : "Nouveau"}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold text-gradient-green">
                            {contribution.amount.toLocaleString()} FCFA
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {contribution.date}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                contribution.status === "Active"
                                  ? "default"
                                  : "secondary"
                              }
                              className={
                                contribution.status === "Active"
                                  ? "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white border-0"
                                  : "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30"
                              }
                            >
                              {getStatusLabel(contribution.status)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-3">
                  {contributions.map((contribution) => (
                    <div 
                      key={contribution.id}
                      className={`p-4 rounded-xl bg-muted/30 border border-border/50 space-y-3 transition-all duration-300 active:scale-[0.98] ${
                        contribution.isNew ? "animate-highlight animate-slide-in-top ring-2 ring-primary/30" : ""
                      }`}
                    >
                      {/* User and Status Row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center ${
                            contribution.isNew ? "animate-pulse-ring" : ""
                          }`}>
                            <UserIcon className="w-4 h-4 text-primary" />
                          </div>
                          <span className="font-medium text-foreground">{contribution.user}</span>
                          {contribution.isNew && (
                            <Badge className="bg-primary/20 text-primary text-xs animate-pulse">
                              {locale === "en" ? "New" : "Nouveau"}
                            </Badge>
                          )}
                        </div>
                        <Badge
                          variant={contribution.status === "Active" ? "default" : "secondary"}
                          className={
                            contribution.status === "Active"
                              ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white border-0"
                              : "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30"
                          }
                        >
                          {getStatusLabel(contribution.status)}
                        </Badge>
                      </div>

                      {/* Amount */}
                      <div className="flex items-center gap-2">
                        <Coins className="w-4 h-4 text-emerald-500" />
                        <span className="font-bold text-lg text-gradient-green">
                          {contribution.amount.toLocaleString()} FCFA
                        </span>
                      </div>

                      {/* Date */}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>{contribution.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Contribution Modal - Full width on mobile, bottom sheet style */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-card border-border sm:max-w-md w-[calc(100%-2rem)] mx-auto rounded-t-2xl sm:rounded-lg fixed bottom-0 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 left-1/2 -translate-x-1/2 max-h-[85vh] overflow-y-auto">
          {showSuccess ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center animate-success-pop">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <p className="text-lg font-semibold text-foreground">
                {locale === "en" ? "Contribution Added!" : "Contribution ajoutee!"}
              </p>
              <p className="text-sm text-muted-foreground text-center">
                {amount && `${parseFloat(amount).toLocaleString()} FCFA`}
              </p>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{t("contributions.addNewContribution")}</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  {t("contributions.addDescription")}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Current User Display */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    {t("contributions.user")}
                  </label>
                  <div className="p-3 bg-primary/10 rounded-lg border border-primary/20 text-foreground font-medium">
                    {currentUser?.name || "Not logged in"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {locale === "en" 
                      ? "Contribution will be added in your name" 
                      : "La contribution sera ajoutee en votre nom"}
                  </p>
                </div>

                {/* Amount Input */}
                <div className="space-y-2">
                  <label htmlFor="amount" className="text-sm font-medium text-foreground">
                    {t("contributions.amount")}
                  </label>
                  <div className="relative">
                    <Input
                      id="amount"
                      type="number"
                      placeholder={t("contributions.amountPlaceholder")}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="pr-16 bg-input border-border text-foreground h-12 text-base"
                      min="0"
                      step="1000"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">
                      FCFA
                    </span>
                  </div>
                </div>

                {/* Action Buttons - Full width stacked on mobile */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsOpen(false)}
                    className="flex-1 border-border hover:bg-muted min-h-[44px]"
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button
                    onClick={handleAddContribution}
                    disabled={!amount || isLoading}
                    className="flex-1 bg-primary hover:bg-accent text-primary-foreground min-h-[44px] active:animate-button-press"
                  >
                    {isLoading && <Spinner className="mr-2" />}
                    {t("common.submit")}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
