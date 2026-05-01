"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

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

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations(detectLocale());

  useEffect(() => {
    console.error("Global app error:", error);
  }, [error]);

  return (
    <html>
      <body className="bg-background text-foreground antialiased">
        <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center px-4 py-10">
          <section className="w-full rounded-xl border border-destructive/40 bg-destructive/10 p-6 shadow-sm">
            <h1 className="flex items-center gap-2 text-xl font-semibold text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {t("errors.criticalError")}
            </h1>
            <p className="mt-3 text-sm text-foreground">
              {t("errors.criticalErrorDescription")}
            </p>
            <button
              type="button"
              onClick={() => reset()}
              className="mt-5 inline-flex min-h-11 items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              {t("errors.retry")}
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
