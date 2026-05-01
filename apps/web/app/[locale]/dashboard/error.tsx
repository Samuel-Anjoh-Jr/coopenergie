"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations } from "@/lib/translations";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams();
  const locale = (params?.locale as string) ?? "en";
  const t = useTranslations(locale);

  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="space-y-6 md:space-y-8 px-4 md:px-0">
      <Card className="border-destructive/50 bg-destructive/10">
        <CardHeader>
          <div className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <CardTitle className="text-destructive">
              {t("errors.somethingWentWrong").replace(" Please try again.", "")}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-foreground">
            {t("errors.dashboardErrorDescription")}
          </p>
          {process.env.NODE_ENV === "development" && error?.message && (
            <details className="text-xs text-muted-foreground bg-muted/50 p-3 rounded border border-border">
              <summary className="cursor-pointer font-mono">{t("errors.errorDetails")}</summary>
              <pre className="mt-2 overflow-auto whitespace-pre-wrap break-words">
                {error.message}
                {error.digest && `\nDigest: ${error.digest}`}
              </pre>
            </details>
          )}
          <Button
            onClick={() => reset()}
            variant="default"
            className="w-full sm:w-auto"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {t("errors.tryAgain")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
