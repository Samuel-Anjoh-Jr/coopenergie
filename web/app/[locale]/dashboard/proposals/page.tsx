"use client";

import { useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Locale, useTranslations } from "@/lib/translations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, ThumbsUp, ThumbsDown, CheckCircle, Lightbulb, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/lib/auth-context";

interface Proposal {
  id: number;
  title: string;
  titleFr: string;
  description: string;
  descriptionFr: string;
  status: "pending" | "approved" | "rejected";
  yesVotes: number;
  noVotes: number;
  userVoted?: "yes" | "no" | null;
  previousYesPercent?: number;
  isVoting?: boolean;
  justVoted?: boolean;
  isNew?: boolean;
}

export default function ProposalsPage() {
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const t = useTranslations(locale as Locale);
  const { currentUser } = useAuth();
  const listRef = useRef<HTMLDivElement>(null);

  const [proposals, setProposals] = useState<Proposal[]>([
    {
      id: 1,
      title: "Solar Panel Installation - Bonaberi District",
      titleFr: "Installation de panneaux solaires - Quartier Bonaberi",
      description: "Install 50 solar panels across 25 households in Bonaberi district to provide reliable electricity. Estimated cost: 8,500,000 FCFA. Each household contributes 340,000 FCFA.",
      descriptionFr: "Installer 50 panneaux solaires dans 25 foyers du quartier Bonaberi pour fournir de l'electricite fiable. Cout estime: 8 500 000 FCFA. Chaque foyer contribue 340 000 FCFA.",
      status: "pending",
      yesVotes: 38,
      noVotes: 4,
      userVoted: null,
    },
    {
      id: 2,
      title: "Battery Storage System - Phase 1",
      titleFr: "Systeme de stockage par batterie - Phase 1",
      description: "Purchase and install 10 lithium battery units for energy storage during low sunlight periods. Ensures 8 hours of backup power. Budget: 12,000,000 FCFA.",
      descriptionFr: "Acheter et installer 10 unites de batteries au lithium pour le stockage d'energie pendant les periodes de faible ensoleillement. Garantit 8 heures d'alimentation de secours. Budget: 12 000 000 FCFA.",
      status: "pending",
      yesVotes: 22,
      noVotes: 8,
      userVoted: null,
    },
    {
      id: 3,
      title: "Community Training Workshop",
      titleFr: "Atelier de formation communautaire",
      description: "Monthly training sessions on solar panel maintenance, energy savings, and cooperative governance. Led by local technicians. Cost: 500,000 FCFA per session.",
      descriptionFr: "Sessions de formation mensuelles sur la maintenance des panneaux solaires, les economies d'energie et la gouvernance cooperative. Anime par des techniciens locaux. Cout: 500 000 FCFA par session.",
      status: "approved",
      yesVotes: 52,
      noVotes: 3,
      userVoted: "yes",
    },
    {
      id: 4,
      title: "Extend to Akwa Neighborhood",
      titleFr: "Extension au quartier Akwa",
      description: "Expand the cooperative to include 30 new households in Akwa. Requires partnership with local chief and initial investment of 25,000,000 FCFA.",
      descriptionFr: "Etendre la cooperative pour inclure 30 nouveaux foyers a Akwa. Necessite un partenariat avec le chef local et un investissement initial de 25 000 000 FCFA.",
      status: "rejected",
      yesVotes: 18,
      noVotes: 35,
      userVoted: "no",
    },
  ]);

  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState({ title: "", description: "" });

  const handleCreateProposal = () => {
    if (formData.title && formData.description) {
      setIsLoading(true);
      // Simulate API call
      setTimeout(() => {
        setShowSuccess(true);
        setIsLoading(false);
        
        setTimeout(() => {
          const newProposal: Proposal = {
            id: Math.max(...proposals.map(p => p.id), 0) + 1,
            title: formData.title,
            titleFr: formData.title,
            description: formData.description,
            descriptionFr: formData.description,
            status: "pending",
            yesVotes: 1,
            noVotes: 0,
            userVoted: "yes",
            isNew: true,
          };

          setShowSuccess(false);
          setIsOpen(false);
          setProposals([newProposal, ...proposals]);
          setFormData({ title: "", description: "" });
          
          // Scroll to top
          setTimeout(() => {
            listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 100);
          
          // Remove new flag after animation
          setTimeout(() => {
            setProposals(prev => prev.map(p => ({ ...p, isNew: false })));
          }, 2500);
          
          toast.success(t("toasts.proposalCreated"), {
            description: locale === "en" 
              ? "Your proposal is now open for voting"
              : "Votre proposition est maintenant ouverte au vote"
          });
        }, 600);
      }, 750);
    }
  };

  const handleVote = (proposalId: number, voteType: "yes" | "no") => {
    // Set voting state
    setProposals(prev => prev.map(p => 
      p.id === proposalId 
        ? { ...p, isVoting: true, previousYesPercent: (p.yesVotes / (p.yesVotes + p.noVotes)) * 100 }
        : p
    ));

    // Simulate API call
    setTimeout(() => {
      setProposals(prev =>
        prev.map((proposal) => {
          if (proposal.id === proposalId) {
            // If user already voted, remove previous vote
            let yesVotes = proposal.yesVotes;
            let noVotes = proposal.noVotes;

            if (proposal.userVoted === "yes") {
              yesVotes -= 1;
            } else if (proposal.userVoted === "no") {
              noVotes -= 1;
            }

            // Add new vote
            if (voteType === "yes") {
              yesVotes += 1;
            } else {
              noVotes += 1;
            }

            return {
              ...proposal,
              yesVotes,
              noVotes,
              userVoted: voteType,
              isVoting: false,
              justVoted: true,
            };
          }
          return proposal;
        })
      );

      // Remove justVoted flag after animation
      setTimeout(() => {
        setProposals(prev => prev.map(p => ({ ...p, justVoted: false })));
      }, 2000);

      // Get proposal title for toast
      const proposal = proposals.find(p => p.id === proposalId);
      const proposalTitle = locale === "fr" ? proposal?.titleFr : proposal?.title;
      
      toast.success(
        `${t("toasts.youVoted")} ${voteType === "yes" ? (locale === "en" ? "Yes" : "Oui") : (locale === "en" ? "No" : "Non")}`,
        {
          description: `${t("toasts.onProposal")} "${proposalTitle?.substring(0, 30)}${(proposalTitle?.length || 0) > 30 ? '...' : ''}"`,
        }
      );
    }, 600);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-primary/10 text-primary";
      case "rejected":
        return "bg-destructive/10 text-destructive";
      case "pending":
      default:
        return "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-200";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "approved":
        return t("proposals.approved");
      case "rejected":
        return t("proposals.rejected");
      case "pending":
      default:
        return t("proposals.pending");
    }
  };

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            {t("proposals.title")}
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {t("proposals.description")}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <Button
            onClick={() => setIsOpen(true)}
            className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg btn-glow w-full sm:w-fit group min-h-[44px] active:animate-button-press"
          >
            <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform duration-300" />
            {t("proposals.createProposal")}
          </Button>
          {/* Guided Hint */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30 text-sm animate-pulse">
            <Lightbulb className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <span className="text-blue-700 dark:text-blue-300">
              {t("demo.hintVote")}
            </span>
            <ArrowRight className="w-4 h-4 text-blue-500 hidden sm:block" />
          </div>
        </div>
      </div>

      {proposals.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">{t("proposals.noProposals")}</p>
          </CardContent>
        </Card>
      ) : (
        <div ref={listRef} className="grid gap-4 md:gap-6">
          {proposals.map((proposal) => {
            const totalVotes = proposal.yesVotes + proposal.noVotes;
            const yesPercentage = totalVotes > 0 ? (proposal.yesVotes / totalVotes) * 100 : 50;
            const percentChange = proposal.previousYesPercent !== undefined 
              ? yesPercentage - proposal.previousYesPercent 
              : 0;

            return (
              <Card 
                key={proposal.id} 
                className={`border-border/50 bg-card/50 backdrop-blur overflow-hidden card-hover-glow group transition-all duration-300 ${
                  proposal.isNew ? "animate-highlight animate-slide-in-top ring-2 ring-primary/30" : ""
                } ${proposal.justVoted ? "ring-2 ring-primary/50" : ""} ${
                  proposal.status === "pending" && !proposal.userVoted && proposal.id === 1 
                    ? "ring-2 ring-blue-500/40 ring-offset-2 ring-offset-background" 
                    : ""
                }`}
              >
                <CardHeader className="p-4 md:p-6 pb-2 md:pb-3">
                  <div className="flex flex-col gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-lg md:text-xl leading-tight">
                          {locale === "fr" ? proposal.titleFr : proposal.title}
                        </CardTitle>
                        {proposal.isNew && (
                          <Badge className="bg-primary/20 text-primary text-xs animate-pulse">
                            {locale === "en" ? "New" : "Nouveau"}
                          </Badge>
                        )}
                      </div>
                      <Badge variant="outline" className={`mt-2 ${getStatusColor(proposal.status)}`}>
                        {getStatusLabel(proposal.status)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4 md:p-6 pt-0 space-y-4">
                  {/* Description */}
                  <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                    {locale === "fr" ? proposal.descriptionFr : proposal.description}
                  </p>

                  {/* Vote Ratio Bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">
                        {t("proposals.voteRatio")}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs md:text-sm">
                          {proposal.yesVotes} {t("proposals.voteYes")} / {proposal.noVotes} {t("proposals.voteNo")}
                        </span>
                        {proposal.justVoted && percentChange !== 0 && (
                          <span className={`text-xs font-semibold animate-success-pop ${
                            percentChange > 0 ? "text-emerald-500" : "text-red-500"
                          }`}>
                            {percentChange > 0 ? "+" : ""}{Math.round(percentChange)}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="w-full h-3 md:h-4 bg-muted rounded-full overflow-hidden flex shadow-inner">
                      <div
                        className={`bg-gradient-to-r from-emerald-500 via-green-500 to-green-600 rounded-full shadow-lg ${
                          proposal.justVoted ? "transition-all duration-1000" : "transition-all duration-500"
                        }`}
                        style={{ width: `${yesPercentage}%` }}
                      />
                      <div
                        className={`bg-gradient-to-r from-red-400 to-red-500 rounded-full ${
                          proposal.justVoted ? "transition-all duration-1000" : "transition-all duration-500"
                        }`}
                        style={{ width: `${100 - yesPercentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground font-medium">
                      <span>{Math.round(yesPercentage)}% {t("proposals.voteYes")}</span>
                      <span>{Math.round(100 - yesPercentage)}% {t("proposals.voteNo")}</span>
                    </div>
                  </div>

                  {/* Voting Buttons - 44px touch target */}
                  <div className="flex gap-2 md:gap-3 pt-2">
                    <Button
                      onClick={() => handleVote(proposal.id, "yes")}
                      disabled={proposal.status !== "pending" || proposal.isVoting}
                      variant={proposal.userVoted === "yes" ? "default" : "outline"}
                      className={`flex-1 min-h-[44px] text-sm active:animate-button-press transition-all duration-300 ${
                        proposal.userVoted === "yes"
                          ? "bg-primary hover:bg-accent text-primary-foreground"
                          : "border-border hover:bg-muted"
                      } ${proposal.justVoted && proposal.userVoted === "yes" ? "animate-pulse-ring" : ""}`}
                    >
                      {proposal.isVoting ? (
                        <Spinner className="w-4 h-4" />
                      ) : proposal.userVoted === "yes" && proposal.justVoted ? (
                        <CheckCircle className="w-4 h-4 mr-1 md:mr-2 animate-success-pop" />
                      ) : (
                        <ThumbsUp className="w-4 h-4 mr-1 md:mr-2" />
                      )}
                      <span className="hidden xs:inline">{t("proposals.voteYes")}</span>
                      <span className="xs:hidden">{locale === "fr" ? "Oui" : "Yes"}</span>
                      {proposal.userVoted === "yes" && (
                        <span className="ml-1 text-xs opacity-75 hidden sm:inline">({t("proposals.youVoted")})</span>
                      )}
                    </Button>
                    <Button
                      onClick={() => handleVote(proposal.id, "no")}
                      disabled={proposal.status !== "pending" || proposal.isVoting}
                      variant={proposal.userVoted === "no" ? "default" : "outline"}
                      className={`flex-1 min-h-[44px] text-sm active:animate-button-press transition-all duration-300 ${
                        proposal.userVoted === "no"
                          ? "bg-destructive hover:bg-red-700 text-destructive-foreground"
                          : "border-border hover:bg-muted"
                      } ${proposal.justVoted && proposal.userVoted === "no" ? "animate-pulse-ring" : ""}`}
                    >
                      {proposal.isVoting ? (
                        <Spinner className="w-4 h-4" />
                      ) : proposal.userVoted === "no" && proposal.justVoted ? (
                        <CheckCircle className="w-4 h-4 mr-1 md:mr-2 animate-success-pop" />
                      ) : (
                        <ThumbsDown className="w-4 h-4 mr-1 md:mr-2" />
                      )}
                      <span className="hidden xs:inline">{t("proposals.voteNo")}</span>
                      <span className="xs:hidden">{locale === "fr" ? "Non" : "No"}</span>
                      {proposal.userVoted === "no" && (
                        <span className="ml-1 text-xs opacity-75 hidden sm:inline">({t("proposals.youVoted")})</span>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Proposal Modal - Full width bottom sheet on mobile */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-card border-border sm:max-w-2xl w-[calc(100%-2rem)] mx-auto rounded-t-2xl sm:rounded-lg fixed bottom-0 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 left-1/2 -translate-x-1/2 max-h-[90vh] overflow-y-auto">
          {showSuccess ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center animate-success-pop">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <p className="text-lg font-semibold text-foreground">
                {locale === "en" ? "Proposal Created!" : "Proposition creee!"}
              </p>
              <p className="text-sm text-muted-foreground text-center">
                {formData.title}
              </p>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg md:text-xl">{t("proposals.createNewProposal")}</DialogTitle>
                <DialogDescription className="text-muted-foreground text-sm">
                  {t("proposals.createDescription")}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Creator info */}
                {currentUser && (
                  <p className="text-sm text-muted-foreground">
                    {locale === "en" 
                      ? `Creating as: ${currentUser.name}` 
                      : `Creation en tant que: ${currentUser.name}`}
                  </p>
                )}

                {/* Title Input */}
                <div className="space-y-2">
                  <label htmlFor="title" className="text-sm font-medium text-foreground">
                    {t("proposals.proposalTitle")}
                  </label>
                  <Input
                    id="title"
                    placeholder={t("proposals.titlePlaceholder")}
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className="bg-input border-border text-foreground h-12 text-base"
                  />
                </div>

                {/* Description Textarea */}
                <div className="space-y-2">
                  <label htmlFor="description" className="text-sm font-medium text-foreground">
                    {t("proposals.proposalDescription")}
                  </label>
                  <Textarea
                    id="description"
                    placeholder={t("proposals.descriptionPlaceholder")}
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="bg-input border-border text-foreground min-h-32 resize-none text-base"
                  />
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
                    onClick={handleCreateProposal}
                    disabled={!formData.title || !formData.description || isLoading}
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
