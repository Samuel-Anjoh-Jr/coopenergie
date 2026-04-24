"use client";

import { useMemo, useState } from "react";

import { useQuery, useSubscription } from "@apollo/client";
import {
  AlertCircle,
  CreditCard,
  ExternalLink,
  Landmark,
  Plus,
  Phone,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CELOSCAN_BASE } from "@/lib/config";
import { GET_MY_COOPERATIVES } from "@/lib/graphql/queries/cooperative";
import { GET_PROPOSALS } from "@/lib/graphql/queries/proposals";
import { GET_WITHDRAWAL_ELIGIBILITY } from "@/lib/graphql/queries/withdrawal";
import { SUBSCRIPTION_ON_VOTE } from "@/lib/graphql/subscriptions/cooperative";
import { detectCameroonMobileMoney } from "@/lib/phone-utils";
import { restClient } from "@/lib/rest-client";
import { Locale, useTranslations } from "@/lib/translations";

type Proposal = {
  id: string;
  title: string;
  description: string;
  status: string;
  type?: string;
  yesVotes: number;
  noVotes: number;
  txHash?: string | null;
  hasUserVoted: boolean;
  createdAt: string;
  withdrawalRequest?: {
    amountXAF: number;
    destinationType: string;
    status: string;
  } | null;
};

type WithdrawalEligibility = {
  canVote: boolean;
  reason: string;
  eligibleVoterCount: number;
  currentYesVotes: number;
  currentNoVotes: number;
  threshold: number;
  yesPercent: number;
  quorumReached: boolean;
};

type VoteResponse = {
  vote?: {
    txHash?: string | null;
  };
};

type CreateProposalResponse = {
  txHash?: string | null;
};

type UserRole = "MEMBER" | "COOP_ADMIN" | "PLATFORM_ADMIN";

function truncateHash(hash?: string | null): string {
  if (!hash) {
    return "-";
  }
  if (hash.length <= 16) {
    return hash;
  }
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}

function getStatusLabel(status: string, t: ReturnType<typeof useTranslations>) {
  const lowered = status.toLowerCase();
  if (lowered === "approved") {
    return t("proposals.approved");
  }
  if (lowered === "rejected") {
    return t("proposals.rejected");
  }
  return t("proposals.pending");
}

function getStatusColor(status: string) {
  const lowered = status.toLowerCase();
  if (lowered === "approved") {
    return "bg-primary/10 text-primary";
  }
  if (lowered === "rejected") {
    return "bg-destructive/10 text-destructive";
  }
  return "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-200";
}

export default function ProposalsPage() {
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const t = useTranslations(locale as Locale);
  const { data: session } = useSession();

  const [isOpen, setIsOpen] = useState(false);
  const [isWithdrawalOpen, setIsWithdrawalOpen] = useState(false);
  const [formData, setFormData] = useState({ title: "", description: "" });
  const [withdrawalForm, setWithdrawalForm] = useState({
    amountXAF: "",
    reason: "",
    destinationType: "MTN_MOMO",
    recipientPhone: "",
    recipientBankName: "",
    recipientBankAccount: "",
    recipientBankAccountHolder: "",
    recipientName: session?.user?.name || "",
  });
  const [isSubmittingProposal, setIsSubmittingProposal] = useState(false);
  const [isSubmittingWithdrawal, setIsSubmittingWithdrawal] = useState(false);
  const [votingProposalId, setVotingProposalId] = useState<string | null>(null);

  const { data: myCooperativesData } = useQuery(GET_MY_COOPERATIVES);
  const cooperativeId = myCooperativesData?.myCooperatives?.[0]?.id;
  const cooperativeBalance =
    myCooperativesData?.myCooperatives?.[0]?.balance || 0;
  const userRole =
    (myCooperativesData?.myCooperatives?.[0]?.membership?.role as UserRole) ||
    "MEMBER";

  const {
    data: proposalsData,
    loading: loadingProposals,
    refetch: refetchProposals,
  } = useQuery(GET_PROPOSALS, {
    variables: { cooperativeId },
    skip: !cooperativeId,
  });

  useSubscription(SUBSCRIPTION_ON_VOTE, {
    variables: { cooperativeId },
    skip: !cooperativeId,
    onData: () => {
      void refetchProposals();
    },
  });

  const proposals: Proposal[] = proposalsData?.proposals ?? [];

  const sortedProposals = useMemo(
    () =>
      [...proposals].sort(
        (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
      ),
    [proposals],
  );

  const handleVote = async (proposalId: string, choice: boolean) => {
    setVotingProposalId(proposalId);
    try {
      const response = await restClient.post<VoteResponse>("/votes", {
        proposalId,
        choice,
      });

      const txHash = response?.vote?.txHash;
      toast.success(
        txHash
          ? `${t("toasts.voteRecorded")} (${truncateHash(txHash)})`
          : t("toasts.voteRecorded"),
      );

      void refetchProposals();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("errors.voteFailed"),
      );
    } finally {
      setVotingProposalId(null);
    }
  };

  const handleCreateProposal = async () => {
    if (
      !cooperativeId ||
      !formData.title.trim() ||
      !formData.description.trim()
    ) {
      toast.error(t("errors.invalidFormValues"));
      return;
    }

    setIsSubmittingProposal(true);
    try {
      const response = await restClient.post<CreateProposalResponse>(
        "/proposals",
        {
          cooperativeId,
          title: formData.title.trim(),
          description: formData.description.trim(),
        },
      );

      const txHash = response?.txHash;
      toast.success(
        txHash
          ? `${t("toasts.proposalCreated")} (${truncateHash(txHash)})`
          : t("toasts.proposalCreated"),
      );

      setFormData({ title: "", description: "" });
      setIsOpen(false);
      void refetchProposals();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("errors.createProposalFailed"),
      );
    } finally {
      setIsSubmittingProposal(false);
    }
  };

  const handleCreateWithdrawal = async () => {
    if (
      !cooperativeId ||
      !withdrawalForm.amountXAF ||
      !withdrawalForm.reason.trim()
    ) {
      toast.error(t("errors.invalidFormValues"));
      return;
    }

    const amount = parseInt(withdrawalForm.amountXAF, 10);
    if (amount > cooperativeBalance) {
      toast.error(t("errors.amountExceedsBalance"));
      return;
    }

    const isMobileMoneyDestination = ["MTN_MOMO", "ORANGE_MONEY"].includes(
      withdrawalForm.destinationType,
    );
    const detectedMobileMoney = isMobileMoneyDestination
      ? detectCameroonMobileMoney(withdrawalForm.recipientPhone)
      : null;

    if (isMobileMoneyDestination && !detectedMobileMoney) {
      toast.error(t("errors.phoneRequired"));
      return;
    }

    setIsSubmittingWithdrawal(true);
    try {
      await restClient.post("/withdrawals/propose", {
        cooperativeId,
        amountXAF: amount,
        reason: withdrawalForm.reason.trim(),
        destinationType:
          detectedMobileMoney?.destinationType ?? withdrawalForm.destinationType,
        recipientPhone: detectedMobileMoney?.normalizedPhone,
        recipientOperator: detectedMobileMoney?.carrier,
        recipientBankName: withdrawalForm.recipientBankName || undefined,
        recipientBankAccount: withdrawalForm.recipientBankAccount || undefined,
        recipientName: withdrawalForm.recipientName.trim(),
      });

      toast.success(t("auth.withdrawalCreatedMessage"));

      setWithdrawalForm({
        amountXAF: "",
        reason: "",
        destinationType: "MTN_MOMO",
        recipientPhone: "",
        recipientBankName: "",
        recipientBankAccount: "",
        recipientBankAccountHolder: "",
        recipientName: session?.user?.name || "",
      });
      setIsWithdrawalOpen(false);
      void refetchProposals();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("errors.withdrawalRequestFailed"),
      );
    } finally {
      setIsSubmittingWithdrawal(false);
    }
  };

  if (!session?.user) {
    return null;
  }

  return (
    <TooltipProvider>
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
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
            <Button
              onClick={() => setIsOpen(true)}
              disabled={!cooperativeId}
              className="bg-linear-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg btn-glow w-full sm:w-fit group min-h-11 active:animate-button-press"
            >
              <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform duration-300" />
              {t("proposals.createProposal")}
            </Button>
            {userRole === "COOP_ADMIN" && (
              <Button
                onClick={() => setIsWithdrawalOpen(true)}
                disabled={!cooperativeId}
                className="bg-linear-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-lg btn-glow w-full sm:w-fit group min-h-11 active:animate-button-press"
              >
                <CreditCard className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform duration-300" />
                {t("proposals.proposeWithdrawal")}
              </Button>
            )}
          </div>
        </div>

        {loadingProposals ? (
          <Card className="border-border bg-card">
            <CardContent className="flex items-center justify-center h-64">
              <Spinner className="h-6 w-6" />
            </CardContent>
          </Card>
        ) : sortedProposals.length === 0 ? (
          <Card className="border-border bg-card">
            <CardContent className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">
                {t("proposals.noProposals")}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:gap-6">
            {sortedProposals.map((proposal) => (
              <ProposalCard
                key={proposal.id}
                proposal={proposal}
                t={t}
                onVote={handleVote}
                votingProposalId={votingProposalId}
                refetchProposals={refetchProposals}
              />
            ))}
          </div>
        )}

        {/* Create Proposal Modal */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="bg-card border-border sm:max-w-2xl w-[calc(100%-2rem)] mx-auto rounded-t-2xl sm:rounded-lg fixed bottom-0 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 left-1/2 -translate-x-1/2 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg md:text-xl">
                {t("proposals.createNewProposal")}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm">
                {t("proposals.createDescription")}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label
                  htmlFor="title"
                  className="text-sm font-medium text-foreground"
                >
                  {t("proposals.proposalTitle")}
                </label>
                <Input
                  id="title"
                  placeholder={t("proposals.titlePlaceholder")}
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  className="bg-input border-border text-foreground h-12 text-base"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="description"
                  className="text-sm font-medium text-foreground"
                >
                  {t("proposals.proposalDescription")}
                </label>
                <Textarea
                  id="description"
                  placeholder={t("proposals.descriptionPlaceholder")}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="bg-input border-border text-foreground min-h-32 resize-none text-base"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 border-border hover:bg-muted min-h-11"
                  disabled={isSubmittingProposal}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  onClick={() => void handleCreateProposal()}
                  disabled={
                    !formData.title.trim() ||
                    !formData.description.trim() ||
                    !cooperativeId ||
                    isSubmittingProposal
                  }
                  className="flex-1 bg-primary hover:bg-accent text-primary-foreground min-h-11 active:animate-button-press"
                >
                  {isSubmittingProposal ? (
                    <>
                      <Spinner className="mr-2" />
                      {t("status.submitting")}
                    </>
                  ) : (
                    t("common.submit")
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Withdrawal Proposal Modal */}
        <Dialog open={isWithdrawalOpen} onOpenChange={setIsWithdrawalOpen}>
          <DialogContent className="bg-card border-border sm:max-w-2xl w-[calc(100%-2rem)] mx-auto rounded-t-2xl sm:rounded-lg fixed bottom-0 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 left-1/2 -translate-x-1/2 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg md:text-xl">
                {t("proposals.proposeWithdrawal")}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm">
                {t("auth.withdrawalRequestDescription")}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label
                  htmlFor="amount"
                  className="text-sm font-medium text-foreground"
                >
                  {t("proposals.amountLabel")}
                </label>
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  max={cooperativeBalance}
                  placeholder={t("auth.amountExample")}
                  value={withdrawalForm.amountXAF}
                  onChange={(e) =>
                    setWithdrawalForm((prev) => ({
                      ...prev,
                      amountXAF: e.target.value,
                    }))
                  }
                  className="bg-input border-border text-foreground h-12 text-base"
                />
                <p className="text-xs text-muted-foreground">
                  {t("proposals.availableBalance")}:{" "}
                  {cooperativeBalance.toLocaleString()} FCFA
                </p>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="reason"
                  className="text-sm font-medium text-foreground"
                >
                  {t("proposals.reasonLabel")}
                </label>
                <Textarea
                  id="reason"
                  placeholder={t("proposals.reasonPlaceholder")}
                  value={withdrawalForm.reason}
                  onChange={(e) =>
                    setWithdrawalForm((prev) => ({
                      ...prev,
                      reason: e.target.value,
                    }))
                  }
                  className="bg-input border-border text-foreground min-h-24 resize-none text-base"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="destinationType"
                  className="text-sm font-medium text-foreground"
                >
                  {t("proposals.destinationType")}
                </label>
                <Select
                  value={withdrawalForm.destinationType}
                  onValueChange={(value) =>
                    setWithdrawalForm((prev) => ({
                      ...prev,
                      destinationType: value,
                      recipientPhone: "",
                      recipientBankName: "",
                      recipientBankAccount: "",
                    }))
                  }
                >
                  <SelectTrigger className="bg-input border-border text-foreground h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="MTN_MOMO">
                      {t("profile.mtnMomo")}
                    </SelectItem>
                    <SelectItem value="ORANGE_MONEY">
                      {t("profile.orangeMoney")}
                    </SelectItem>
                    <SelectItem value="BANK_TRANSFER">
                      {t("proposals.bankTransfer")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(withdrawalForm.destinationType === "MTN_MOMO" ||
                withdrawalForm.destinationType === "ORANGE_MONEY") && (
                <div className="space-y-2">
                  <label
                    htmlFor="phone"
                    className="text-sm font-medium text-foreground"
                  >
                    {t("proposals.phoneNumber")} (6XXXXXXXX)
                  </label>
                  <Input
                    id="phone"
                    placeholder={t("proposals.phonePlaceholder")}
                    value={withdrawalForm.recipientPhone}
                    onChange={(e) => {
                      const value = e.target.value;
                      const detected = detectCameroonMobileMoney(value);
                      setWithdrawalForm((prev) => ({
                        ...prev,
                        recipientPhone: value,
                        destinationType:
                          detected?.destinationType ?? prev.destinationType,
                      }));
                    }}
                    className="bg-input border-border text-foreground h-12 text-base"
                  />
                  {detectCameroonMobileMoney(withdrawalForm.recipientPhone) ? (
                    <p className="text-xs text-muted-foreground">
                      {detectCameroonMobileMoney(withdrawalForm.recipientPhone)
                        ?.destinationType === "MTN_MOMO"
                        ? t("profile.mtnMomo")
                        : t("profile.orangeMoney")}
                    </p>
                  ) : null}
                </div>
              )}

              {withdrawalForm.destinationType === "BANK_TRANSFER" && (
                <>
                  <div className="space-y-2">
                    <label
                      htmlFor="bankName"
                      className="text-sm font-medium text-foreground"
                    >
                      {t("profile.bankName")}
                    </label>
                    <Input
                      id="bankName"
                      placeholder={t("proposals.bankPlaceholder")}
                      value={withdrawalForm.recipientBankName}
                      onChange={(e) =>
                        setWithdrawalForm((prev) => ({
                          ...prev,
                          recipientBankName: e.target.value,
                        }))
                      }
                      className="bg-input border-border text-foreground h-12 text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="accountNumber"
                      className="text-sm font-medium text-foreground"
                    >
                      {t("profile.accountNumber")}
                    </label>
                    <Input
                      id="accountNumber"
                      placeholder={t("profile.accountNumberExample")}
                      value={withdrawalForm.recipientBankAccount}
                      onChange={(e) =>
                        setWithdrawalForm((prev) => ({
                          ...prev,
                          recipientBankAccount: e.target.value,
                        }))
                      }
                      className="bg-input border-border text-foreground h-12 text-base"
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <label
                  htmlFor="recipientName"
                  className="text-sm font-medium text-foreground"
                >
                  {t("profile.recipientName")}
                </label>
                <Input
                  id="recipientName"
                  placeholder={t("proposals.recipientPlaceholder")}
                  value={withdrawalForm.recipientName}
                  onChange={(e) =>
                    setWithdrawalForm((prev) => ({
                      ...prev,
                      recipientName: e.target.value,
                    }))
                  }
                  className="bg-input border-border text-foreground h-12 text-base"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsWithdrawalOpen(false)}
                  className="flex-1 border-border hover:bg-muted min-h-11"
                  disabled={isSubmittingWithdrawal}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  onClick={() => void handleCreateWithdrawal()}
                  disabled={
                    !withdrawalForm.amountXAF ||
                    !withdrawalForm.reason.trim() ||
                    !cooperativeId ||
                    isSubmittingWithdrawal ||
                    (["MTN_MOMO", "ORANGE_MONEY"].includes(
                      withdrawalForm.destinationType,
                    ) &&
                      !detectCameroonMobileMoney(
                        withdrawalForm.recipientPhone,
                      ))
                  }
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white min-h-11 active:animate-button-press"
                >
                  {isSubmittingWithdrawal ? (
                    <>
                      <Spinner className="mr-2" />
                      {t("status.submitting")}
                    </>
                  ) : (
                    t("common.submit")
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

function ProposalCard({
  proposal,
  t,
  onVote,
  votingProposalId,
  refetchProposals,
}: {
  proposal: Proposal;
  t: ReturnType<typeof useTranslations>;
  onVote: (proposalId: string, choice: boolean) => Promise<void>;
  votingProposalId: string | null;
  refetchProposals: () => void;
}) {
  const { data: eligibilityData } = useQuery(GET_WITHDRAWAL_ELIGIBILITY, {
    variables: { proposalId: proposal.id },
    skip: proposal.type !== "WITHDRAWAL",
  });

  const eligibility: WithdrawalEligibility | undefined =
    eligibilityData?.withdrawalEligibility;
  const isWithdrawal = proposal.type === "WITHDRAWAL";
  const totalVotes = proposal.yesVotes + proposal.noVotes;
  const yesPercentage =
    totalVotes > 0 ? (proposal.yesVotes / totalVotes) * 100 : 0;
  const disableVoting =
    proposal.status.toLowerCase() !== "pending" || proposal.hasUserVoted;
  const txUrl = proposal.txHash
    ? `${CELOSCAN_BASE}/tx/${proposal.txHash}`
    : null;

  const cannotVoteWithdrawal =
    isWithdrawal && eligibility && !eligibility.canVote;

  return (
    <Card
      key={proposal.id}
      className="border-border/50 bg-card/50 backdrop-blur overflow-hidden card-hover-glow group transition-all duration-300"
    >
      <CardHeader className="p-4 md:p-6 pb-2 md:pb-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-lg md:text-xl leading-tight flex-1">
            {proposal.title}
          </CardTitle>
          <div className="flex items-center gap-2">
            {isWithdrawal && (
              <Badge className="bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/30">
                {t("proposals.withdrawalTag")}
              </Badge>
            )}
            <Badge
              variant="outline"
              className={`${
                proposal.status.toLowerCase() === "approved"
                  ? "bg-primary/10 text-primary"
                  : proposal.status.toLowerCase() === "rejected"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-200"
              }`}
            >
              {proposal.status.toLowerCase() === "approved"
                ? t("proposals.approved")
                : proposal.status.toLowerCase() === "rejected"
                  ? t("proposals.rejected")
                  : t("proposals.pending")}
            </Badge>
          </div>
        </div>
        {isWithdrawal && proposal.withdrawalRequest && (
          <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground flex-wrap">
            <span className="font-semibold text-foreground">
              {proposal.withdrawalRequest.amountXAF.toLocaleString()} FCFA
            </span>
            {proposal.withdrawalRequest.destinationType === "MTN_MOMO" && (
              <span className="flex items-center gap-1">
                <Phone className="w-4 h-4" /> MTN MoMo
              </span>
            )}
            {proposal.withdrawalRequest.destinationType === "ORANGE_MONEY" && (
              <span className="flex items-center gap-1">
                <Phone className="w-4 h-4" /> Orange Money
              </span>
            )}
            {proposal.withdrawalRequest.destinationType === "BANK_TRANSFER" && (
              <span className="flex items-center gap-1">
                <Landmark className="w-4 h-4" /> {t("proposals.bankTransfer")}
              </span>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="p-4 md:p-6 pt-0 space-y-4">
        <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
          {proposal.description}
        </p>

        {isWithdrawal && eligibility && (
          <div className="space-y-3 bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">
                {t("proposals.eligibleMembers")}
              </span>
              <span className="text-orange-600 dark:text-orange-400 font-semibold">
                {eligibility.currentYesVotes}/{eligibility.eligibleVoterCount}{" "}
                {t("proposals.yesShort")}
              </span>
            </div>
            <div className="w-full h-3 bg-muted rounded-full overflow-hidden shadow-inner">
              <div
                className="h-full bg-linear-to-r from-orange-400 to-orange-600 shadow-lg transition-all duration-500"
                style={{
                  width: `${
                    eligibility.eligibleVoterCount > 0
                      ? (eligibility.currentYesVotes /
                          eligibility.eligibleVoterCount) *
                        100
                      : 0
                  }%`,
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {t("proposals.thresholdRequired")}: {eligibility.threshold}%
            </p>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">
              {t("proposals.voteRatio")}
            </span>
            <span className="text-muted-foreground text-xs md:text-sm">
              {proposal.yesVotes} {t("proposals.voteYes")} / {proposal.noVotes}{" "}
              {t("proposals.voteNo")}
            </span>
          </div>
          <div className="w-full h-3 md:h-4 bg-muted rounded-full overflow-hidden flex shadow-inner">
            <div
              className="bg-linear-to-r from-emerald-500 via-green-500 to-green-600 rounded-full shadow-lg transition-all duration-500"
              style={{ width: `${yesPercentage}%` }}
            />
            <div
              className="bg-linear-to-r from-red-400 to-red-500 rounded-full transition-all duration-500"
              style={{ width: `${100 - yesPercentage}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className="font-mono text-xs">
            {truncateHash(proposal.txHash)}
          </span>
          {txUrl ? (
            <a
              href={txUrl}
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1 text-xs"
            >
              {t("blockchain.viewOnCeloScan")}
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : null}
        </div>

        {cannotVoteWithdrawal && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 text-xs bg-muted/50 p-2 rounded border border-muted-foreground/20">
                <AlertCircle className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {t("proposals.notEligibleWithdrawal")}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p className="text-sm">
                {t("proposals.notEligibleWithdrawalDescription")}
              </p>
            </TooltipContent>
          </Tooltip>
        )}

        <div className="flex gap-2 md:gap-3 pt-2">
          <Tooltip open={cannotVoteWithdrawal ? undefined : false}>
            <TooltipTrigger asChild>
              <Button
                onClick={() => void onVote(proposal.id, true)}
                disabled={
                  disableVoting ||
                  votingProposalId === proposal.id ||
                  cannotVoteWithdrawal
                }
                variant="outline"
                className="flex-1 min-h-11 text-sm active:animate-button-press border-border hover:bg-muted"
              >
                {votingProposalId === proposal.id ? (
                  <Spinner className="w-4 h-4" />
                ) : (
                  <ThumbsUp className="w-4 h-4 mr-1 md:mr-2" />
                )}
                {t("proposals.voteYes")}
              </Button>
            </TooltipTrigger>
            {cannotVoteWithdrawal && (
              <TooltipContent side="top">
                <p className="text-sm">
                  {t("proposals.notEligibleWithdrawalDescription")}
                </p>
              </TooltipContent>
            )}
          </Tooltip>

          <Tooltip open={cannotVoteWithdrawal ? undefined : false}>
            <TooltipTrigger asChild>
              <Button
                onClick={() => void onVote(proposal.id, false)}
                disabled={
                  disableVoting ||
                  votingProposalId === proposal.id ||
                  cannotVoteWithdrawal
                }
                variant="outline"
                className="flex-1 min-h-11 text-sm active:animate-button-press border-border hover:bg-muted"
              >
                {votingProposalId === proposal.id ? (
                  <Spinner className="w-4 h-4" />
                ) : (
                  <ThumbsDown className="w-4 h-4 mr-1 md:mr-2" />
                )}
                {t("proposals.voteNo")}
              </Button>
            </TooltipTrigger>
            {cannotVoteWithdrawal && (
              <TooltipContent side="top">
                <p className="text-sm">
                  {t("proposals.notEligibleWithdrawalDescription")}
                </p>
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </CardContent>
    </Card>
  );
}
