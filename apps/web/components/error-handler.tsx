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
    let lastToastAt = 0;

    const shouldSuppressToast = () => {
      const now = Date.now();
      if (now - lastToastAt < 3000) {
        return true;
      }
      lastToastAt = now;
      return false;
    };

    const stringifyReason = (reason: unknown) => {
      if (!reason) return "";
      if (typeof reason === "string") return reason;
      if (reason instanceof Error) {
        return `${reason.name}: ${reason.message}`;
      }

      try {
        return JSON.stringify(reason);
      } catch {
        return String(reason);
      }
    };

    const isNoisyBackgroundError = (reason: unknown) => {
      const text = stringifyReason(reason).toLowerCase();

      return (
        text.includes("messaging/unsupported-browser") ||
        text.includes("aborterror") ||
        text.includes("connection is closing") ||
        text.includes("database connection is closing") ||
        text.includes("failed to fetch")
      );
    };

    const handleError = (event: ErrorEvent) => {
      if (isNoisyBackgroundError(event.error ?? event.message)) {
        event.preventDefault();
        return;
      }

      console.error("Unhandled error:", event.error);
      if (!shouldSuppressToast()) {
        toast.error(t("errors.unknownError"));
      }
      event.preventDefault();
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (isNoisyBackgroundError(event.reason)) {
        event.preventDefault();
        return;
      }

      console.error("Unhandled promise rejection:", event.reason);
      if (!shouldSuppressToast()) {
        toast.error(t("errors.unknownError"));
      }
      event.preventDefault();
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection,
      );
    };
  }, [t]);

  return null;
}
