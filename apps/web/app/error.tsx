"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations } from "@/lib/translations";

function detectLocale(): string {
  if (typeof document !== "undefined") {
    const lang = document.documentElement.lang;
    if (lang) return lang;
  }
  if (typeof window !== "undefined") {
    const path = window.location.pathname;
    if (path.startsWith("/fr")) return "fr";
  }
  return "en";
}

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations(detectLocale());

  useEffect(() => {
    console.error("App route error:", error);
    toast.error(t("errors.somethingWentWrong"));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 md:py-12">
      <Card className="border-destructive/40 bg-destructive/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            {t("errors.oopsTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-foreground">
            {t("errors.pageErrorDescription")}
          </p>
          {process.env.NODE_ENV === "development" && error.message ? (
            <pre className="overflow-auto rounded border border-border bg-muted/60 p-3 text-xs text-muted-foreground">
              {error.message}
            </pre>
          ) : null}
          <Button onClick={() => reset()} className="w-full sm:w-auto">
            <RefreshCw className="mr-2 h-4 w-4" />
            {t("errors.tryAgain")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
