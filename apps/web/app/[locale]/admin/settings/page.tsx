"use client";

import { useState } from "react";
import { useQuery } from "@apollo/client";
import { Save, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { GET_PLATFORM_SETTINGS } from "@/lib/graphql/queries/withdrawal";
import { restClient } from "@/lib/rest-client";

export default function AdminSettingsPage() {
  const [thresholdDefault, setThresholdDefault] = useState("");
  const [thresholdMin, setThresholdMin] = useState("");
  const [thresholdMax, setThresholdMax] = useState("");
  const [quorumMinVotes, setQuorumMinVotes] = useState("");
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { loading } = useQuery(GET_PLATFORM_SETTINGS, {
    onCompleted: (data: {
      platformSettings: {
        withdrawalThresholdDefault: number;
        withdrawalThresholdMin: number;
        withdrawalThresholdMax: number;
        withdrawalQuorumMinVotes: number;
        maintenanceMode: boolean;
      };
    }) => {
      if (data?.platformSettings) {
        setThresholdDefault(String(data.platformSettings.withdrawalThresholdDefault ?? ""));
        setThresholdMin(String(data.platformSettings.withdrawalThresholdMin ?? ""));
        setThresholdMax(String(data.platformSettings.withdrawalThresholdMax ?? ""));
        setQuorumMinVotes(String(data.platformSettings.withdrawalQuorumMinVotes ?? ""));
        setMaintenanceMode(data.platformSettings.maintenanceMode ?? false);
      }
    },
  });

  const handleSave = async () => {
    if (!thresholdDefault || !thresholdMin || !thresholdMax || !quorumMinVotes) {
      toast.error("All fields are required");
      return;
    }
    setIsSaving(true);
    try {
      await restClient.patch("/admin/settings", {
        withdrawalThresholdDefault: parseInt(thresholdDefault, 10),
        withdrawalThresholdMin: parseInt(thresholdMin, 10),
        withdrawalThresholdMax: parseInt(thresholdMax, 10),
        withdrawalQuorumMinVotes: parseInt(quorumMinVotes, 10),
        maintenanceMode,
      });
      toast.success("Platform settings saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Platform Settings</h1>
        <p className="text-muted-foreground mt-1">Configure global governance settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Governance Settings</CardTitle>
          <CardDescription>These settings apply to all cooperatives on the platform</CardDescription>
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
                <AlertTitle className="text-amber-800 dark:text-amber-300">Warning</AlertTitle>
                <AlertDescription className="text-amber-700 dark:text-amber-400 text-sm">
                  Changes affect all cooperatives on the platform
                </AlertDescription>
              </Alert>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="thresholdDefault">Default Threshold (%)</Label>
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
                <div className="space-y-2">
                  <Label htmlFor="quorumMinVotes">Minimum Quorum Votes</Label>
                  <Input
                    id="quorumMinVotes"
                    type="number"
                    min="1"
                    value={quorumMinVotes}
                    onChange={(e) => setQuorumMinVotes(e.target.value)}
                    placeholder="e.g. 3"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="text-sm font-medium">Maintenance Mode</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Disable withdrawals across all cooperatives
                  </p>
                </div>
                <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
              </div>

              <Button
                onClick={() => void handleSave()}
                disabled={isSaving || !thresholdDefault || !thresholdMin || !thresholdMax || !quorumMinVotes}
                className="w-full sm:w-auto"
              >
                {isSaving ? <Spinner className="mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                {isSaving ? "Saving..." : "Save Settings"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
