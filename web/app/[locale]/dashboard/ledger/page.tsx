"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Locale, useTranslations } from "@/lib/translations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  DollarSign, 
  MessageSquare, 
  CheckCircle, 
  Lock, 
  Filter, 
  Copy, 
  Check, 
  Shield, 
  Blocks,
  Clock,
  FileText,
  Info,
  Lightbulb,
  Sparkles
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface LedgerEvent {
  id: number;
  type: "contribution" | "proposal" | "vote";
  user: string;
  summary: string;
  summaryFr: string;
  timestamp: string;
  hash: string;
  blockNumber: number;
}

interface Block {
  number: number;
  timestamp: string;
  transactions: LedgerEvent[];
}

type FilterType = "all" | "contribution" | "vote" | "proposal";

// Generate a fake but realistic-looking transaction hash
const generateHash = (seed: number): string => {
  const chars = "0123456789ABCDEF";
  let hash = "0x";
  for (let i = 0; i < 40; i++) {
    hash += chars[(seed * (i + 1) * 7) % 16];
  }
  return hash;
};

// Truncate hash for display
const truncateHash = (hash: string): string => {
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
};

export default function LedgerPage() {
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const t = useTranslations(locale as Locale);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [animatedIds, setAnimatedIds] = useState<Set<number>>(new Set());

  const events: LedgerEvent[] = [
    {
      id: 1,
      type: "contribution",
      user: "Sophie Ngo Ebonji",
      summary: "Added 500,000 FCFA contribution for Bonaberi solar installation",
      summaryFr: "A ajoute une contribution de 500 000 FCFA pour l'installation solaire de Bonaberi",
      timestamp: "2024-03-15 14:32 UTC",
      hash: generateHash(1),
      blockNumber: 1847,
    },
    {
      id: 2,
      type: "vote",
      user: "Amara Oumarou Diallo",
      summary: "Voted YES on Battery Storage System - Phase 1",
      summaryFr: "A vote OUI sur Systeme de stockage par batterie - Phase 1",
      timestamp: "2024-03-15 10:15 UTC",
      hash: generateHash(2),
      blockNumber: 1847,
    },
    {
      id: 3,
      type: "proposal",
      user: "Pierre Essomba Mbida",
      summary: "Created proposal: Extend to Akwa Neighborhood",
      summaryFr: "A cree la proposition: Extension au quartier Akwa",
      timestamp: "2024-03-14 16:45 UTC",
      hash: generateHash(3),
      blockNumber: 1846,
    },
    {
      id: 4,
      type: "contribution",
      user: "Jean-Baptiste Akogo",
      summary: "Added 750,000 FCFA contribution for solar panel equipment",
      summaryFr: "A ajoute une contribution de 750 000 FCFA pour l'equipement solaire",
      timestamp: "2024-03-14 09:20 UTC",
      hash: generateHash(4),
      blockNumber: 1846,
    },
    {
      id: 5,
      type: "vote",
      user: "Marie-Claire Ndoumbe",
      summary: "Voted YES on Community Training Workshop proposal",
      summaryFr: "A vote OUI sur la proposition d'atelier de formation communautaire",
      timestamp: "2024-03-13 13:05 UTC",
      hash: generateHash(5),
      blockNumber: 1845,
    },
    {
      id: 6,
      type: "contribution",
      user: "Charles Kamga Fotso",
      summary: "Added 1,200,000 FCFA contribution - largest individual contribution this month",
      summaryFr: "A ajoute une contribution de 1 200 000 FCFA - plus grande contribution individuelle ce mois-ci",
      timestamp: "2024-03-12 11:30 UTC",
      hash: generateHash(6),
      blockNumber: 1844,
    },
    {
      id: 7,
      type: "proposal",
      user: "Lisa Mireille Fotso",
      summary: "Created proposal: Community Training Workshop for solar maintenance",
      summaryFr: "A cree la proposition: Atelier de formation communautaire pour la maintenance solaire",
      timestamp: "2024-03-11 15:12 UTC",
      hash: generateHash(7),
      blockNumber: 1843,
    },
    {
      id: 8,
      type: "contribution",
      user: "Emmanuel Tchuente",
      summary: "Added 600,000 FCFA contribution for battery storage fund",
      summaryFr: "A ajoute une contribution de 600 000 FCFA pour le fonds de stockage de batterie",
      timestamp: "2024-03-10 08:45 UTC",
      hash: generateHash(8),
      blockNumber: 1842,
    },
  ];

  // Group events into blocks
  const groupIntoBlocks = (events: LedgerEvent[]): Block[] => {
    const blockMap = new Map<number, LedgerEvent[]>();
    
    events.forEach(event => {
      const existing = blockMap.get(event.blockNumber) || [];
      blockMap.set(event.blockNumber, [...existing, event]);
    });

    return Array.from(blockMap.entries())
      .map(([number, transactions]) => ({
        number,
        timestamp: transactions[0].timestamp,
        transactions,
      }))
      .sort((a, b) => b.number - a.number);
  };

  const filteredEvents = activeFilter === "all" 
    ? events 
    : events.filter(event => event.type === activeFilter);

  const blocks = groupIntoBlocks(filteredEvents);

  // Animate entries on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedIds(new Set(events.map(e => e.id)));
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const copyToClipboard = async (hash: string) => {
    await navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case "contribution":
        return <DollarSign className="w-4 h-4 md:w-5 md:h-5" />;
      case "vote":
        return <CheckCircle className="w-4 h-4 md:w-5 md:h-5" />;
      case "proposal":
        return <MessageSquare className="w-4 h-4 md:w-5 md:h-5" />;
      default:
        return <Lock className="w-4 h-4 md:w-5 md:h-5" />;
    }
  };

  const getEventLabel = (type: string) => {
    switch (type) {
      case "contribution":
        return t("ledger.eventContribution");
      case "vote":
        return t("ledger.eventVote");
      case "proposal":
        return t("ledger.eventProposal");
      default:
        return t("ledger.type");
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case "contribution":
        return "text-primary bg-primary/10";
      case "vote":
        return "text-accent bg-accent/10";
      case "proposal":
        return "text-blue-600 dark:text-blue-400 bg-blue-100/20 dark:bg-blue-900/20";
      default:
        return "text-muted-foreground bg-muted";
    }
  };

  const filterButtons: { key: FilterType; label: string; icon: React.ReactNode }[] = [
    { key: "all", label: t("ledger.filterAll"), icon: <Filter className="w-4 h-4" /> },
    { key: "contribution", label: t("ledger.filterContributions"), icon: <DollarSign className="w-4 h-4" /> },
    { key: "vote", label: t("ledger.filterVotes"), icon: <CheckCircle className="w-4 h-4" /> },
    { key: "proposal", label: t("ledger.filterProposals"), icon: <MessageSquare className="w-4 h-4" /> },
  ];

  return (
    <TooltipProvider>
      <div className="space-y-6 md:space-y-8">
        {/* Demo Hint */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-sm">
          <Lightbulb className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <span className="text-emerald-700 dark:text-emerald-300">
            {t("demo.hintLedger")}
          </span>
          <Badge className="ml-auto bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs">
            <Sparkles className="w-3 h-3 mr-1" />
            {t("demo.keyFeature")}
          </Badge>
        </div>

        {/* Header */}
        <div className="space-y-2 md:space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center ring-2 ring-primary/30 ring-offset-2 ring-offset-background">
              <Blocks className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                {t("ledger.title")}
              </h1>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Shield className="w-3 h-3" />
                {locale === "fr" ? "Securise par cryptographie" : "Cryptographically secured"}
              </p>
            </div>
          </div>
          <p className="text-base md:text-lg text-foreground font-medium">
            {t("ledger.everything")}
          </p>
          <p className="text-sm md:text-base text-muted-foreground">
            {t("ledger.description")}
          </p>
        </div>

        {/* Why This Matters Card */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-card to-accent/5 overflow-hidden">
          <CardHeader className="p-4 md:p-6 pb-2 md:pb-3">
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <Info className="w-4 h-4 md:w-5 md:h-5 text-primary" />
              {locale === "fr" ? "Pourquoi c'est important" : "Why This Matters"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
              {locale === "fr" 
                ? "Chaque transaction est enregistree de maniere permanente et ne peut pas etre modifiee ou supprimee. Cela garantit que chaque contribution, vote et proposition est entierement tracable et verifiable par tous les membres de la cooperative."
                : "Every transaction is permanently recorded and cannot be modified or deleted. This ensures that every contribution, vote, and proposal is fully traceable and verifiable by all cooperative members."
              }
            </p>
            <div className="flex flex-wrap gap-3 mt-4">
              <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5">
                <Lock className="w-3 h-3 mr-1" />
                {locale === "fr" ? "Immutable" : "Immutable"}
              </Badge>
              <Badge variant="outline" className="border-accent/30 text-accent bg-accent/5">
                <Shield className="w-3 h-3 mr-1" />
                {locale === "fr" ? "Verifie" : "Verified"}
              </Badge>
              <Badge variant="outline" className="border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/5">
                <Blocks className="w-3 h-3 mr-1" />
                {locale === "fr" ? "Distribue" : "Distributed"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Filter Buttons */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap scrollbar-hide">
          {filterButtons.map((filter) => {
            const count = filter.key === "all" 
              ? events.length 
              : events.filter(e => e.type === filter.key).length;
            return (
              <Button
                key={filter.key}
                variant={activeFilter === filter.key ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveFilter(filter.key)}
                className={`gap-2 flex-shrink-0 min-h-[40px] md:min-h-[36px] ${
                  activeFilter === filter.key
                    ? "bg-primary text-primary-foreground"
                    : "border-border hover:bg-muted"
                }`}
              >
                {filter.icon}
                <span className="whitespace-nowrap">{filter.label}</span>
                <Badge 
                  variant="secondary" 
                  className={`ml-1 text-xs ${
                    activeFilter === filter.key 
                      ? "bg-white/20 text-white" 
                      : "bg-muted-foreground/10"
                  }`}
                >
                  {count}
                </Badge>
              </Button>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredEvents.length === 0 ? (
          <Card className="border-border bg-card">
            <CardContent className="flex flex-col items-center justify-center h-64 gap-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-lg font-medium text-foreground">
                  {locale === "fr" ? "Aucune transaction trouvee" : "No transactions found"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {locale === "fr" 
                    ? "Aucune transaction ne correspond a ce filtre" 
                    : "No transactions match this filter"
                  }
                </p>
              </div>
              <Button 
                variant="outline" 
                onClick={() => setActiveFilter("all")}
                className="mt-2"
              >
                {locale === "fr" ? "Voir toutes les transactions" : "View all transactions"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Block-grouped transactions */}
            {blocks.map((block) => (
              <div key={block.number} className="space-y-3">
                {/* Block Header */}
                <div className="flex items-center gap-3 px-1">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
                    <Blocks className="w-4 h-4 text-primary" />
                    <span className="font-mono text-sm font-semibold text-foreground">
                      {locale === "fr" ? "Bloc" : "Block"} #{block.number}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{block.timestamp.split(" ")[0]}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {block.transactions.length} {locale === "fr" ? "tx" : "txs"}
                  </Badge>
                </div>

                {/* Block Transactions */}
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-[15px] md:left-[19px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-accent to-primary/50" />

                  <div className="space-y-3">
                    {block.transactions.map((event, idx) => (
                      <div 
                        key={event.id} 
                        className={`relative pl-12 md:pl-16 group transition-all duration-500 ${
                          animatedIds.has(event.id) 
                            ? "opacity-100 translate-y-0" 
                            : "opacity-0 translate-y-4"
                        }`}
                        style={{ transitionDelay: `${idx * 100}ms` }}
                      >
                        {/* Timeline dot */}
                        <div className={`absolute left-0 top-1 w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center border-4 border-background ${getEventColor(event.type)} group-hover:scale-110 transition-transform duration-300`}>
                          {getEventIcon(event.type)}
                        </div>

                        {/* Event card */}
                        <Card className="border-border/50 bg-card/50 backdrop-blur hover:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 group">
                          <CardContent className="p-4 md:pt-6 md:p-6">
                            <div className="space-y-2 md:space-y-3">
                              {/* Event header with verified badge */}
                              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <Badge
                                      variant="outline"
                                      className={`${getEventColor(event.type)} border-current/20 text-xs`}
                                    >
                                      {getEventLabel(event.type)}
                                    </Badge>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Badge 
                                          variant="outline" 
                                          className="border-green-500/30 text-green-600 dark:text-green-400 bg-green-500/5 text-xs cursor-help"
                                        >
                                          <Shield className="w-3 h-3 mr-1" />
                                          {locale === "fr" ? "Verifie" : "Verified"}
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="max-w-xs">
                                        <p className="text-sm">
                                          {locale === "fr" 
                                            ? "Cette transaction est enregistree de maniere permanente et ne peut pas etre modifiee ou supprimee."
                                            : "This transaction is permanently recorded and cannot be modified or deleted."
                                          }
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>
                                  <p className="font-medium text-foreground group-hover:text-primary transition-colors text-sm md:text-base">
                                    {event.user}
                                  </p>
                                </div>
                              </div>

                              {/* Event summary */}
                              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                                {locale === "fr" ? event.summaryFr : event.summary}
                              </p>

                              {/* Event footer with hash */}
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-border">
                                <div className="text-xs text-muted-foreground">
                                  <p className="font-mono">{event.timestamp}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <code className="text-xs text-muted-foreground font-mono bg-muted/50 px-2 py-1 rounded">
                                    {truncateHash(event.hash)}
                                  </code>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0"
                                        onClick={() => copyToClipboard(event.hash)}
                                      >
                                        {copiedHash === event.hash ? (
                                          <Check className="w-3.5 h-3.5 text-green-500" />
                                        ) : (
                                          <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                                        )}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                      <p className="text-sm">
                                        {copiedHash === event.hash 
                                          ? (locale === "fr" ? "Copie!" : "Copied!") 
                                          : (locale === "fr" ? "Copier le hash" : "Copy hash")
                                        }
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              </div>

                              {/* Immutability indicator */}
                              <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1">
                                <Lock className="w-3 h-3 flex-shrink-0" />
                                <span>{t("ledger.permanentRecord")}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats Footer */}
        <Card className="border-border/50 bg-muted/30">
          <CardContent className="p-4 md:p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl md:text-3xl font-bold text-primary">{events.length}</p>
                <p className="text-xs md:text-sm text-muted-foreground">
                  {locale === "fr" ? "Transactions" : "Transactions"}
                </p>
              </div>
              <div>
                <p className="text-2xl md:text-3xl font-bold text-accent">{blocks.length}</p>
                <p className="text-xs md:text-sm text-muted-foreground">
                  {locale === "fr" ? "Blocs" : "Blocks"}
                </p>
              </div>
              <div>
                <p className="text-2xl md:text-3xl font-bold text-foreground">100%</p>
                <p className="text-xs md:text-sm text-muted-foreground">
                  {locale === "fr" ? "Verifie" : "Verified"}
                </p>
              </div>
              <div>
                <p className="text-2xl md:text-3xl font-bold text-green-600 dark:text-green-400">0</p>
                <p className="text-xs md:text-sm text-muted-foreground">
                  {locale === "fr" ? "Modifications" : "Modifications"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
