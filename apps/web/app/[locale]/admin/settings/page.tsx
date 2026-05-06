"use client";

import { useState } from "react";
import { useQuery } from "@apollo/client";
import {
  Save,
  AlertCircle,
  ShieldAlert,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { GET_PLATFORM_SETTINGS } from "@/lib/graphql/queries/withdrawal";
import { DASHBOARD_REALTIME_POLL_INTERVAL_MS } from "@/lib/realtime";
import { restClient } from "@/lib/rest-client";

type PlatformSettings = {
  withdrawalThresholdDefault: number;
  withdrawalThresholdMin: number;
  withdrawalThresholdMax: number;
  maintenanceMode: boolean;
};

export default function AdminSettingsPage() {
  const [thresholdDefault, setThresholdDefault] = useState("");
  const [thresholdMin, setThresholdMin] = useState("");
  const [thresholdMax, setThresholdMax] = useState("");
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [lastLoaded, setLastLoaded] = useState<PlatformSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { loading, refetch } = useQuery(GET_PLATFORM_SETTINGS, {
    pollInterval: DASHBOARD_REALTIME_POLL_INTERVAL_MS,
    onCompleted: (data: { platformSettings: PlatformSettings }) => {
      if (data?.platformSettings) {
        // Only populate form fields on the first load; subsequent polls must
        // NOT reset user edits — they only refresh the change-tracking baseline.
        setLastLoaded((prev) => {
          if (prev === null) {
            setThresholdDefault(
              String(data.platformSettings.withdrawalThresholdDefault ?? ""),
            );
            setThresholdMin(
              String(data.platformSettings.withdrawalThresholdMin ?? ""),
            );
            setThresholdMax(
              String(data.platformSettings.withdrawalThresholdMax ?? ""),
            );
            setMaintenanceMode(data.platformSettings.maintenanceMode ?? false);
          }
          return data.platformSettings;
        });
      }
    },
  });

  const parsedThresholdDefault = Number(thresholdDefault);
  const parsedThresholdMin = Number(thresholdMin);
  const parsedThresholdMax = Number(thresholdMax);

  const validationErrors: string[] = [];

  if (!thresholdDefault || !thresholdMin || !thresholdMax) {
    validationErrors.push("All settings fields are required.");
  }

  if (
    !Number.isInteger(parsedThresholdDefault) ||
    parsedThresholdDefault < 1 ||
    parsedThresholdDefault > 100
  ) {
    validationErrors.push(
      "Default threshold must be an integer between 1 and 100.",
    );
  }

  if (
    !Number.isInteger(parsedThresholdMin) ||
    parsedThresholdMin < 1 ||
    parsedThresholdMin > 100
  ) {
    validationErrors.push(
      "Minimum threshold must be an integer between 1 and 100.",
    );
  }

  if (
    !Number.isInteger(parsedThresholdMax) ||
    parsedThresholdMax < 1 ||
    parsedThresholdMax > 100
  ) {
    validationErrors.push(
      "Maximum threshold must be an integer between 1 and 100.",
    );
  }

  if (parsedThresholdMin > parsedThresholdDefault) {
    validationErrors.push(
      "Minimum threshold cannot be greater than default threshold.",
    );
  }

  if (parsedThresholdDefault > parsedThresholdMax) {
    validationErrors.push(
      "Default threshold cannot be greater than maximum threshold.",
    );
  }

  const hasChanges =
    lastLoaded !== null &&
    (parsedThresholdDefault !== lastLoaded.withdrawalThresholdDefault ||
      parsedThresholdMin !== lastLoaded.withdrawalThresholdMin ||
      parsedThresholdMax !== lastLoaded.withdrawalThresholdMax ||
      maintenanceMode !== lastLoaded.maintenanceMode);

  const handleSave = async () => {
    if (validationErrors.length > 0) {
      toast.error(
        validationErrors[0] ?? "Please fix validation errors before saving.",
      );
      return;
    }

    if (!hasChanges) {
      toast.message("No changes to save.");
      return;
    }

    setIsSaving(true);

    try {
      await restClient.patch("/admin/settings", {
        withdrawalThresholdDefault: parsedThresholdDefault,
        withdrawalThresholdMin: parsedThresholdMin,
        withdrawalThresholdMax: parsedThresholdMax,
        maintenanceMode,
      });
      toast.success("Platform settings saved");
      const { data } = await refetch();
      if (data?.platformSettings) {
        setLastLoaded(data.platformSettings);
        // After a confirmed save, re-sync form fields to the saved values
        setThresholdDefault(
          String(data.platformSettings.withdrawalThresholdDefault ?? ""),
        );
        setThresholdMin(
          String(data.platformSettings.withdrawalThresholdMin ?? ""),
        );
        setThresholdMax(
          String(data.platformSettings.withdrawalThresholdMax ?? ""),
        );
        setMaintenanceMode(data.platformSettings.maintenanceMode ?? false);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save settings",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const restoreLastLoaded = () => {
    if (!lastLoaded) {
      return;
    }

    setThresholdDefault(String(lastLoaded.withdrawalThresholdDefault));
    setThresholdMin(String(lastLoaded.withdrawalThresholdMin));
    setThresholdMax(String(lastLoaded.withdrawalThresholdMax));
    setMaintenanceMode(lastLoaded.maintenanceMode);
  };

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Platform Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure global governance rules for every cooperative on the
          platform.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <SlidersHorizontal className="h-4 w-4" />
              What each input controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="font-medium">Default Threshold (%)</p>
              <p className="text-muted-foreground">
                Baseline yes-vote percentage required for proposals across
                cooperatives.
              </p>
            </div>
            <div>
              <p className="font-medium">Minimum and Maximum Threshold (%)</p>
              <p className="text-muted-foreground">
                Allowed bounds for cooperative-level threshold overrides.
              </p>
            </div>
            <div>
              <p className="font-medium">Maintenance Mode</p>
              <p className="text-muted-foreground">
                Emergency global stop for withdrawals. Keep off during normal
                operation.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="h-4 w-4" />
              Current impact summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              Withdrawal proposals default to{" "}
              <span className="font-medium">{thresholdDefault || "-"}%</span>{" "}
              yes votes.
            </p>
            <p>
              Cooperative admins can set thresholds only between
              <span className="font-medium"> {thresholdMin || "-"}%</span> and
              <span className="font-medium"> {thresholdMax || "-"}%</span>.
            </p>
            <p>
              Maintenance mode is currently
              <span className="font-medium">
                {" "}
                {maintenanceMode ? "ENABLED" : "DISABLED"}
              </span>
              .
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Governance Settings</CardTitle>
          <CardDescription>
            These values are global and affect every cooperative immediately
            after save.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner className="h-6 w-6" />
            </div>
          ) : (
            <>
              <Alert className="bg-amber-500/10 border-amber-500/20">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800 dark:text-amber-300">
                  Warning
                </AlertTitle>
                <AlertDescription className="text-amber-700 dark:text-amber-400 text-sm">
                  Changes affect all cooperatives on the platform. Save
                  carefully.
                </AlertDescription>
              </Alert>

              {validationErrors.length > 0 && (
                <Alert className="border-destructive/30 bg-destructive/5">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <AlertTitle className="text-destructive">
                    Validation required
                  </AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc pl-5 text-sm">
                      {validationErrors.map((error) => (
                        <li key={error}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="thresholdDefault">
                    Default Threshold (%)
                  </Label>
                  <Input
                    id="thresholdDefault"
                    type="number"
                    min="1"
                    max="100"
                    value={thresholdDefault}
                    onChange={(e) => setThresholdDefault(e.target.value)}
                    placeholder="e.g. 60"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="thresholdMin">Min Threshold (%)</Label>
                  <Input
                    id="thresholdMin"
                    type="number"
                    min="1"
                    max="100"
                    value={thresholdMin}
                    onChange={(e) => setThresholdMin(e.target.value)}
                    placeholder="e.g. 50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="thresholdMax">Max Threshold (%)</Label>
                  <Input
                    id="thresholdMax"
                    type="number"
                    min="1"
                    max="100"
                    value={thresholdMax}
                    onChange={(e) => setThresholdMax(e.target.value)}
                    placeholder="e.g. 90"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="text-sm font-medium">Maintenance Mode</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Disables withdrawal processing across all cooperatives.
                  </p>
                </div>
                <Switch
                  checked={maintenanceMode}
                  onCheckedChange={setMaintenanceMode}
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  onClick={() => void handleSave()}
                  disabled={
                    isSaving || validationErrors.length > 0 || !hasChanges
                  }
                  className="w-full sm:w-auto"
                >
                  {isSaving ? (
                    <Spinner className="mr-2" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  {isSaving ? "Saving..." : "Save Settings"}
                </Button>

                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={restoreLastLoaded}
                  disabled={!hasChanges || isSaving}
                >
                  Restore Last Saved
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
