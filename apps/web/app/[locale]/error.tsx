"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations } from "@/lib/translations";

export default function LocaleError({
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
    console.error("Locale route error:", error);
    toast.error(t("errors.somethingWentWrong"));
  }, [error, t]);

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
