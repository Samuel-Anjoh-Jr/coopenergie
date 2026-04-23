"use client";

import { useEffect, useState } from "react";

import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  const { data: session } = useSession();

  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [withdrawalMethod, setWithdrawalMethod] = useState<WithdrawalMethod>("MTN_MOMO");
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
      toast.error(locale === "fr" ? "Le nom est requis" : "Name is required");
      return;
    }

    if (
      (withdrawalMethod === "MTN_MOMO" || withdrawalMethod === "ORANGE_MONEY") &&
      !phone.trim()
    ) {
      toast.error(locale === "fr" ? "Numéro requis" : "Phone number required");
      return;
    }

    if (
      withdrawalMethod === "BANK_TRANSFER" &&
      (!bankName.trim() || !bankAccount.trim())
    ) {
      toast.error(locale === "fr" ? "Détails bancaires requis" : "Bank details required");
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

      toast.success(
        locale === "fr"
          ? "Profil mis à jour avec succès"
          : "Profile updated successfully",
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : locale === "fr"
            ? "Impossible de mettre à jour le profil"
            : "Failed to update profile",
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
            {locale === "fr" ? "Mon Profil" : "My Profile"}
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {locale === "fr"
              ? "Gérez vos informations personnelles et préférences de retrait"
              : "Manage your personal information and withdrawal preferences"}
          </p>
        </div>

        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">
              {locale === "fr" ? "Informations personnelles" : "Personal Information"}
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground mt-1">
              {locale === "fr"
                ? "Votre profil de compte CoopEnergie"
                : "Your CoopEnergie account profile"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Name Field */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-foreground">
                  {locale === "fr" ? "Nom complet" : "Full Name"}
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder={locale === "fr" ? "Ex: Jean Dupont" : "e.g., John Doe"}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-input border-border text-foreground h-12 text-base"
                />
              </div>

              {/* Email Field (Read-only) */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-muted-foreground">
                  {locale === "fr" ? "Email" : "Email"}
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {locale === "fr" ? "Lecture seule" : "Read-only"}
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
              {locale === "fr"
                ? "Préférences de retrait"
                : "Withdrawal Preferences"}
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground mt-1">
              {locale === "fr"
                ? "Configurez votre méthode de retrait préférée"
                : "Configure your preferred withdrawal method"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Withdrawal Method Selection */}
            <div className="space-y-2">
              <Label
                htmlFor="withdrawalMethod"
                className="text-sm font-medium text-foreground"
              >
                {locale === "fr"
                  ? "Méthode de retrait préférée"
                  : "Preferred Withdrawal Method"}
              </Label>
              <Select value={withdrawalMethod} onValueChange={(v) => setWithdrawalMethod(v as WithdrawalMethod)}>
                <SelectTrigger className="bg-input border-border text-foreground h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="MTN_MOMO">
                    {locale === "fr" ? "MTN MoMo" : "MTN MoMo"}
                  </SelectItem>
                  <SelectItem value="ORANGE_MONEY">
                    {locale === "fr" ? "Orange Money" : "Orange Money"}
                  </SelectItem>
                  <SelectItem value="BANK_TRANSFER">
                    {locale === "fr" ? "Virement bancaire" : "Bank Transfer"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Conditional Fields */}
            {(withdrawalMethod === "MTN_MOMO" || withdrawalMethod === "ORANGE_MONEY") && (
              <div className="space-y-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Label htmlFor="phone" className="text-sm font-medium text-foreground cursor-help">
                      {locale === "fr"
                        ? "Numéro de téléphone"
                        : "Phone Number"}{" "}
                      {withdrawalMethod === "MTN_MOMO" ? "(MTN)" : "(Orange)"}
                    </Label>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p className="text-sm">
                      {locale === "fr" ? "Format: 6XXXXXXXX" : "Format: 6XXXXXXXX"}
                    </p>
                  </TooltipContent>
                </Tooltip>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="6XXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-input border-border text-foreground h-12 text-base"
                />
              </div>
            )}

            {withdrawalMethod === "BANK_TRANSFER" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="bankName" className="text-sm font-medium text-foreground">
                    {locale === "fr" ? "Nom de la banque" : "Bank Name"}
                  </Label>
                  <Input
                    id="bankName"
                    type="text"
                    placeholder={locale === "fr" ? "Ex: Ecobank" : "e.g., Ecobank"}
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="bg-input border-border text-foreground h-12 text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bankAccount" className="text-sm font-medium text-foreground">
                    {locale === "fr" ? "Numéro de compte" : "Account Number"}
                  </Label>
                  <Input
                    id="bankAccount"
                    type="text"
                    placeholder={locale === "fr" ? "Ex: 123456789" : "e.g., 123456789"}
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
            className="flex-1 bg-primary hover:bg-accent text-primary-foreground min-h-[44px] active:animate-button-press"
          >
            {isLoading ? (
              <>
                <Spinner className="mr-2" />
                {locale === "fr" ? "Enregistrement..." : "Saving..."}
              </>
            ) : (
              locale === "fr" ? "Enregistrer les modifications" : "Save Changes"
            )}
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}
