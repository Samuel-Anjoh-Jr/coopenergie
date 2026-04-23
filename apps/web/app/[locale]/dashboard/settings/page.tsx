"use client";

import { SetStateAction, useState } from "react";

import { useQuery } from "@apollo/client";
import { AlertCircle, Save } from "lucide-react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Slider } from "@/components/ui/slider";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { GET_MY_COOPERATIVES } from "@/lib/graphql/queries/cooperative";
import {
  GET_COOPERATIVE_SETTINGS,
  GET_PLATFORM_SETTINGS,
} from "@/lib/graphql/queries/withdrawal";
import { restClient } from "@/lib/rest-client";
import { Locale, useTranslations } from "@/lib/translations";

type UserRole = "MEMBER" | "COOP_ADMIN" | "PLATFORM_ADMIN";

export default function SettingsPage() {
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const t = useTranslations(locale as Locale);
  const { data: session } = useSession();

  const [isSubmittingCoop, setIsSubmittingCoop] = useState(false);
  const [isSubmittingPlatform, setIsSubmittingPlatform] = useState(false);

  // Cooperative settings state
  const [coopThreshold, setCoopThreshold] = useState<string>("");

  // Platform settings state
  const [platformThresholdDefault, setPlatformThresholdDefault] =
    useState<string>("");
  const [platformThresholdMin, setPlatformThresholdMin] = useState<string>("");
  const [platformThresholdMax, setPlatformThresholdMax] = useState<string>("");
  const [quorumMinVotes, setQuorumMinVotes] = useState<string>("");
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const { data: myCooperativesData } = useQuery(GET_MY_COOPERATIVES);
  const cooperativeId = myCooperativesData?.myCooperatives?.[0]?.id;
  const userRole =
    (myCooperativesData?.myCooperatives?.[0]?.membership?.role as UserRole) ||
    "MEMBER";

  const { data: coopSettingsData, loading: loadingCoopSettings } = useQuery(
    GET_COOPERATIVE_SETTINGS,
    {
      variables: { cooperativeId },
      skip: !cooperativeId || userRole !== "COOP_ADMIN",
      onCompleted: (data: {
        cooperativeSettings: {
          withdrawalThreshold: { toString: () => SetStateAction<string> };
        };
      }) => {
        if (data?.cooperativeSettings?.withdrawalThreshold) {
          setCoopThreshold(
            data.cooperativeSettings.withdrawalThreshold.toString(),
          );
        }
      },
    },
  );

  const { data: platformSettingsData, loading: loadingPlatformSettings } =
    useQuery(GET_PLATFORM_SETTINGS, {
      skip: userRole !== "PLATFORM_ADMIN",
      onCompleted: (data: {
        platformSettings: {
          withdrawalThresholdDefault: { toString: () => any };
          withdrawalThresholdMin: { toString: () => any };
          withdrawalThresholdMax: { toString: () => any };
          withdrawalQuorumMinVotes: { toString: () => any };
          maintenanceMode: any;
        };
      }) => {
        if (data?.platformSettings) {
          setPlatformThresholdDefault(
            data.platformSettings.withdrawalThresholdDefault?.toString() || "",
          );
          setPlatformThresholdMin(
            data.platformSettings.withdrawalThresholdMin?.toString() || "",
          );
          setPlatformThresholdMax(
            data.platformSettings.withdrawalThresholdMax?.toString() || "",
          );
          setQuorumMinVotes(
            data.platformSettings.withdrawalQuorumMinVotes?.toString() || "",
          );
          setMaintenanceMode(data.platformSettings.maintenanceMode || false);
        }
      },
    });

  const handleSaveCoopSettings = async () => {
    if (!cooperativeId || !coopThreshold) {
      toast.error(t("errors.invalidFormValues"));
      return;
    }

    setIsSubmittingCoop(true);
    try {
      await restClient.patch(`/cooperatives/${cooperativeId}/settings`, {
        threshold: parseInt(coopThreshold, 10),
      });

      toast.success(t("feedback.cooperativeSettingsSaved"));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : locale === "fr"
            ? "Impossible d'enregistrer les paramètres"
            : "Failed to save settings",
      );
    } finally {
      setIsSubmittingCoop(false);
    }
  };

  const handleSavePlatformSettings = async () => {
    if (
      !platformThresholdDefault ||
      !platformThresholdMin ||
      !platformThresholdMax ||
      !quorumMinVotes
    ) {
      toast.error(t("errors.invalidFormValues"));
      return;
    }

    setIsSubmittingPlatform(true);
    try {
      await restClient.patch("/admin/settings", {
        withdrawalThresholdDefault: parseInt(platformThresholdDefault, 10),
        withdrawalThresholdMin: parseInt(platformThresholdMin, 10),
        withdrawalThresholdMax: parseInt(platformThresholdMax, 10),
        withdrawalQuorumMinVotes: parseInt(quorumMinVotes, 10),
        maintenanceMode,
      });

      toast.success(t("feedback.platformSettingsSaved"));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : locale === "fr"
            ? "Impossible d'enregistrer les paramètres"
            : "Failed to save settings",
      );
    } finally {
      setIsSubmittingPlatform(false);
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
            {t("settings.title")}
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {t("settings.description")}
          </p>
        </div>

        {/* Cooperative Admin Section */}
        {userRole === "COOP_ADMIN" && (
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-lg md:text-xl">
                    {locale === "fr"
                      ? "Paramètres de coopérative"
                      : "Cooperative Settings"}
                  </CardTitle>
                  <CardDescription className="text-sm text-muted-foreground mt-1">
                    {locale === "fr"
                      ? "Configurez les seuils de retrait pour votre coopérative"
                      : "Configure withdrawal thresholds for your cooperative"}
                  </CardDescription>
                </div>
                <Badge
                  variant="outline"
                  className="bg-primary/10 text-primary border-primary/20"
                >
                  {locale === "fr" ? "Admin" : "Admin"}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {loadingCoopSettings ? (
                <div className="flex items-center justify-center h-40">
                  <Spinner className="h-6 w-6" />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label
                      htmlFor="coopThreshold"
                      className="text-sm font-medium text-foreground"
                    >
                      {locale === "fr"
                        ? "Seuil de retrait (%)"
                        : "Withdrawal Threshold (%)"}
                    </Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Input
                          id="coopThreshold"
                          type="number"
                          min="1"
                          max="100"
                          placeholder={locale === "fr" ? "Ex: 75" : "e.g., 75"}
                          value={coopThreshold}
                          onChange={(e) => setCoopThreshold(e.target.value)}
                          className="bg-input border-border text-foreground h-12 text-base"
                        />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">
                        <p className="text-sm">
                          {locale === "fr"
                            ? "Le pourcentage de votes 'OUI' requis pour approuver un retrait"
                            : "The percentage of 'YES' votes required to approve a withdrawal"}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                    <p className="text-xs text-muted-foreground">
                      {locale === "fr"
                        ? "Valeur actuelle: "
                        : "Current value: "}
                      {coopSettingsData?.cooperativeSettings
                        ?.withdrawalThreshold || "-"}
                      %
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      onClick={() => void handleSaveCoopSettings()}
                      disabled={!coopThreshold || isSubmittingCoop}
                      className="flex-1 bg-primary hover:bg-accent text-primary-foreground min-h-11 active:animate-button-press"
                    >
                      {isSubmittingCoop ? (
                        <>
                          <Spinner className="mr-2" />
                          {t("common.saving")}
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          {t("common.save")}
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Platform Admin Section */}
        {userRole === "PLATFORM_ADMIN" && (
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-lg md:text-xl">
                    {locale === "fr"
                      ? "Paramètres de plateforme"
                      : "Platform Settings"}
                  </CardTitle>
                  <CardDescription className="text-sm text-muted-foreground mt-1">
                    {locale === "fr"
                      ? "Configurez les paramètres globaux de gouvernance"
                      : "Configure global governance settings"}
                  </CardDescription>
                </div>
                <Badge
                  variant="outline"
                  className="bg-destructive/10 text-destructive border-destructive/20"
                >
                  {locale === "fr" ? "Plateforme" : "Platform"}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {loadingPlatformSettings ? (
                <div className="flex items-center justify-center h-40">
                  <Spinner className="h-6 w-6" />
                </div>
              ) : (
                <>
                  <Alert className="bg-amber-500/10 border-amber-500/20">
                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <AlertTitle className="text-amber-800 dark:text-amber-300">
                      {locale === "fr" ? "Attention" : "Warning"}
                    </AlertTitle>
                    <AlertDescription className="text-amber-700 dark:text-amber-400 text-sm">
                      {locale === "fr"
                        ? "Les modifications affectent toutes les coopératives"
                        : "Changes affect all cooperatives"}
                    </AlertDescription>
                  </Alert>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label
                        htmlFor="thresholdDefault"
                        className="text-sm font-medium text-foreground"
                      >
                        {locale === "fr"
                          ? "Seuil par défaut (%)"
                          : "Default Threshold (%)"}
                      </Label>
                      <Input
                        id="thresholdDefault"
                        type="number"
                        min="1"
                        max="100"
                        placeholder={locale === "fr" ? "Ex: 75" : "e.g., 75"}
                        value={platformThresholdDefault}
                        onChange={(e) =>
                          setPlatformThresholdDefault(e.target.value)
                        }
                        className="bg-input border-border text-foreground h-12 text-base"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="thresholdMin"
                        className="text-sm font-medium text-foreground"
                      >
                        {locale === "fr"
                          ? "Seuil min (%)"
                          : "Min Threshold (%)"}
                      </Label>
                      <Input
                        id="thresholdMin"
                        type="number"
                        min="1"
                        max="100"
                        placeholder={locale === "fr" ? "Ex: 50" : "e.g., 50"}
                        value={platformThresholdMin}
                        onChange={(e) =>
                          setPlatformThresholdMin(e.target.value)
                        }
                        className="bg-input border-border text-foreground h-12 text-base"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="thresholdMax"
                        className="text-sm font-medium text-foreground"
                      >
                        {locale === "fr"
                          ? "Seuil max (%)"
                          : "Max Threshold (%)"}
                      </Label>
                      <Input
                        id="thresholdMax"
                        type="number"
                        min="1"
                        max="100"
                        placeholder={locale === "fr" ? "Ex: 90" : "e.g., 90"}
                        value={platformThresholdMax}
                        onChange={(e) =>
                          setPlatformThresholdMax(e.target.value)
                        }
                        className="bg-input border-border text-foreground h-12 text-base"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="quorumMinVotes"
                        className="text-sm font-medium text-foreground"
                      >
                        {locale === "fr"
                          ? "Min votes quorum"
                          : "Minimum Quorum Votes"}
                      </Label>
                      <Input
                        id="quorumMinVotes"
                        type="number"
                        min="1"
                        placeholder={locale === "fr" ? "Ex: 10" : "e.g., 10"}
                        value={quorumMinVotes}
                        onChange={(e) => setQuorumMinVotes(e.target.value)}
                        className="bg-input border-border text-foreground h-12 text-base"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 bg-muted/30 border border-muted/50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium text-foreground">
                          {locale === "fr"
                            ? "Mode maintenance"
                            : "Maintenance Mode"}
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          {locale === "fr"
                            ? "Désactiver les retraits pendant la maintenance"
                            : "Disable withdrawals during maintenance"}
                        </p>
                      </div>
                      <Switch
                        checked={maintenanceMode}
                        onCheckedChange={setMaintenanceMode}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      onClick={() => void handleSavePlatformSettings()}
                      disabled={
                        !platformThresholdDefault ||
                        !platformThresholdMin ||
                        !platformThresholdMax ||
                        !quorumMinVotes ||
                        isSubmittingPlatform
                      }
                      className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground min-h-11 active:animate-button-press"
                    >
                      {isSubmittingPlatform ? (
                        <>
                          <Spinner className="mr-2" />
                          {t("common.saving")}
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          {t("common.save")}
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {userRole === "MEMBER" && (
          <Alert className="bg-muted/30 border-muted/50">
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
            <AlertTitle className="text-foreground">
              {locale === "fr" ? "Accès refusé" : "Access Denied"}
            </AlertTitle>
            <AlertDescription className="text-muted-foreground text-sm">
              {locale === "fr"
                ? "Seuls les administrateurs peuvent accéder aux paramètres"
                : "Only administrators can access settings"}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </TooltipProvider>
  );
}
