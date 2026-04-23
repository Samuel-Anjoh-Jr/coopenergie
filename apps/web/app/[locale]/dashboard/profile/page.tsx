"use client";

import { useEffect, useState } from "react";

import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { restClient } from "@/lib/rest-client";
import { Locale, useTranslations } from "@/lib/translations";

type WithdrawalMethod = "MTN_MOMO" | "ORANGE_MONEY" | "BANK_TRANSFER";

export default function ProfilePage() {
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const t = useTranslations(locale as Locale);
  const nameExampleKey =
    locale === "fr" ? "profile.nameExampleFr" : "profile.nameExampleEn";
  const bankExampleKey =
    locale === "fr" ? "profile.bankExampleFr" : "profile.bankExampleEn";
  const { data: session } = useSession();

  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [withdrawalMethod, setWithdrawalMethod] =
    useState<WithdrawalMethod>("MTN_MOMO");
  const [phone, setPhone] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccount, setBankAccount] = useState("");

  useEffect(() => {
    if (session?.user) {
      setName(session.user.name || "");
      setEmail(session.user.email || "");
    }
  }, [session]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error(t("errors.nameRequired"));
      return;
    }

    if (
      (withdrawalMethod === "MTN_MOMO" ||
        withdrawalMethod === "ORANGE_MONEY") &&
      !phone.trim()
    ) {
      toast.error(t("errors.phoneRequired"));
      return;
    }

    if (
      withdrawalMethod === "BANK_TRANSFER" &&
      (!bankName.trim() || !bankAccount.trim())
    ) {
      toast.error(t("errors.bankDetailsRequired"));
      return;
    }

    setIsLoading(true);
    try {
      await restClient.patch("/users/me", {
        name: name.trim(),
        preferredWithdrawalMethod: withdrawalMethod,
        withdrawalPhone: phone || undefined,
        withdrawalBankName: bankName || undefined,
        withdrawalBankAccount: bankAccount || undefined,
      });

      toast.success(t("feedback.profileUpdated"));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("errors.updateProfileFailed"),
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!session?.user) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className="space-y-6 md:space-y-8">
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            {t("profile.title")}
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {t("profile.description")}
          </p>
        </div>

        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">
              {t("profile.personalInformation")}
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground mt-1">
              {t("profile.accountProfile")}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Name Field */}
              <div className="space-y-2">
                <Label
                  htmlFor="name"
                  className="text-sm font-medium text-foreground"
                >
                  {t("profile.fullName")}
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder={t(nameExampleKey)}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-input border-border text-foreground h-12 text-base"
                />
              </div>

              {/* Email Field (Read-only) */}
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-sm font-medium text-muted-foreground"
                >
                  {t("common.email")}
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {t("common.readOnly")}
                  </Badge>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  className="bg-muted border-border text-muted-foreground h-12 text-base cursor-not-allowed"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Withdrawal Preferences Card */}
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">
              {t("profile.withdrawalPreferences")}
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground mt-1">
              {t("profile.withdrawalPreferencesDescription")}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Withdrawal Method Selection */}
            <div className="space-y-2">
              <Label
                htmlFor="withdrawalMethod"
                className="text-sm font-medium text-foreground"
              >
                {t("profile.preferredWithdrawalMethod")}
              </Label>
              <Select
                value={withdrawalMethod}
                onValueChange={(v) =>
                  setWithdrawalMethod(v as WithdrawalMethod)
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
                    {t("profile.bankTransfer")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Conditional Fields */}
            {(withdrawalMethod === "MTN_MOMO" ||
              withdrawalMethod === "ORANGE_MONEY") && (
              <div className="space-y-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Label
                      htmlFor="phone"
                      className="text-sm font-medium text-foreground cursor-help"
                    >
                      {t("profile.phoneNumber")}{" "}
                      {withdrawalMethod === "MTN_MOMO" ? "(MTN)" : "(Orange)"}
                    </Label>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p className="text-sm">{t("profile.phoneTooltip")}</p>
                  </TooltipContent>
                </Tooltip>
                <Input
                  id="phone"
                  type="tel"
                  placeholder={t("profile.phonePlaceholder")}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-input border-border text-foreground h-12 text-base"
                />
              </div>
            )}

            {withdrawalMethod === "BANK_TRANSFER" && (
              <>
                <div className="space-y-2">
                  <Label
                    htmlFor="bankName"
                    className="text-sm font-medium text-foreground"
                  >
                    {t("profile.bankName")}
                  </Label>
                  <Input
                    id="bankName"
                    type="text"
                    placeholder={t(bankExampleKey)}
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="bg-input border-border text-foreground h-12 text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="bankAccount"
                    className="text-sm font-medium text-foreground"
                  >
                    {t("profile.accountNumber")}
                  </Label>
                  <Input
                    id="bankAccount"
                    type="text"
                    placeholder={t("profile.accountNumberExample")}
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                    className="bg-input border-border text-foreground h-12 text-base"
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={() => void handleSave()}
            disabled={!name.trim() || isLoading}
            className="flex-1 bg-primary hover:bg-accent text-primary-foreground min-h-11 active:animate-button-press"
          >
            {isLoading ? (
              <>
                <Spinner className="mr-2" />
                {t("common.saving")}
              </>
            ) : (
              t("common.saveChanges")
            )}
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}
