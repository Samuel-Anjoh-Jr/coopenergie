"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useParams } from "next/navigation";

import { useTranslations } from "@/lib/translations";

export function ErrorHandler() {
  const params = useParams();
  const locale = (params?.locale as string) ?? "en";
  const t = useTranslations(locale);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error("Unhandled error:", event.error);
      toast.error(t("errors.unknownError"));
      event.preventDefault();
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled promise rejection:", event.reason);
      toast.error(t("errors.unknownError"));
      event.preventDefault();
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, [locale]);

  return null;
}
