"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useSubscription } from "@apollo/client";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
  RefreshCw,
  Smartphone,
  XCircle,
} from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SUBSCRIPTION_ON_PAYMENT } from "@/lib/graphql/subscriptions/cooperative";
import { detectCameroonMobileMoney } from "@/lib/phone-utils";
import { restClient } from "@/lib/rest-client";
import { Locale, useTranslations } from "@/lib/translations";

type PaymentStatusResponse = {
  paymentId: string;
  reference: string;
  status: "PENDING" | "SUCCESS" | "FAILED";
  amountXAF: number;
  cooperativeId: string;
  createdAt: string;
  updatedAt: string;
};

type PaymentEvent = {
  id: string;
  status: "PENDING" | "SUCCESS" | "FAILED";
  cooperativeId: string;
};

const TOTAL_TIMEOUT_MS = 10 * 60 * 1000;
const POLL_MS = 5000;

function getUssdCode(carrier: "MTN" | "ORANGE" | "UNKNOWN") {
  if (carrier === "MTN") {
    return "*126#";
  }

  if (carrier === "ORANGE") {
    return "#150*50#";
  }

  return "-";
}

function formatCountdown(seconds: number) {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

export default function ContributionPaymentPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = ((params.locale as string) || "en") as Locale;
  const t = useTranslations(locale);

  const paymentId = searchParams.get("paymentId") || "";
  const cooperativeId = searchParams.get("cooperativeId") || "";
  const amountXAF = Number(searchParams.get("amountXAF") || "0");
  const phone = searchParams.get("phone") || "";

  const [status, setStatus] = useState<"PENDING" | "SUCCESS" | "FAILED">(
    "PENDING",
  );
  const [loading, setLoading] = useState(true);
  const [timedOut, setTimedOut] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(
    Math.floor(TOTAL_TIMEOUT_MS / 1000),
  );

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const carrier = useMemo(() => {
    const detected = detectCameroonMobileMoney(phone);
    return detected?.carrier ?? "UNKNOWN";
  }, [phone]);

  const ussdCode = useMemo(() => getUssdCode(carrier), [carrier]);

  const checkStatus = useCallback(async () => {
    if (!paymentId || timedOut) {
      return;
    }

    try {
      const payment = await restClient.get<PaymentStatusResponse>(
        `/payments/${paymentId}`,
      );
      setStatus(payment.status);
      if (payment.status !== "PENDING") {
        setLoading(false);
      }
    } catch {
      // Keep waiting for next poll/subscription event.
    }
  }, [paymentId, timedOut]);

  useSubscription<{ onPayment: PaymentEvent }>(SUBSCRIPTION_ON_PAYMENT, {
    variables: {
      cooperativeId,
    },
    skip: !cooperativeId,
    onData: ({ data }) => {
      const event = data.data?.onPayment;
      if (!event || event.id !== paymentId) {
        return;
      }

      setStatus(event.status);
      if (event.status !== "PENDING") {
        setLoading(false);
      }
    },
  });

  useEffect(() => {
    if (!paymentId) {
      setLoading(false);
      setStatus("FAILED");
      return;
    }

    timeoutRef.current = setTimeout(() => {
      setTimedOut(true);
      setLoading(false);
    }, TOTAL_TIMEOUT_MS);

    countdownRef.current = setInterval(() => {
      setSecondsLeft((value) => Math.max(0, value - 1));
    }, 1000);

    void checkStatus();

    const poll = setInterval(() => {
      if (status !== "PENDING") {
        return;
      }
      void checkStatus();
    }, POLL_MS);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
      clearInterval(poll);
    };
  }, [checkStatus, paymentId, status]);

  useEffect(() => {
    if (status !== "PENDING") {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    }
  }, [status]);

  if (timedOut) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-6 text-center space-y-5">
            <Clock className="h-16 w-16 text-amber-500 mx-auto" />
            <div>
              <h2 className="text-xl font-bold">{t("proposals.pending")}</h2>
              <p className="text-muted-foreground text-sm mt-1">
                {locale === "fr"
                  ? "Le paiement prend plus de temps que prevu."
                  : "Payment is taking longer than expected."}
              </p>
            </div>
            <Button
              onClick={() => router.push(`/${locale}/dashboard/contributions`)}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {locale === "fr"
                ? "Retour aux cotisations"
                : "Back to contributions"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading && status === "PENDING") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <Card>
            <CardContent className="pt-6 pb-4 text-center space-y-4">
              <Loader2 className="h-14 w-14 animate-spin text-primary mx-auto" />
              <div>
                <h2 className="text-xl font-bold">
                  {locale === "fr"
                    ? "Paiement en cours"
                    : "Payment in progress"}
                </h2>
                <p className="text-muted-foreground text-sm mt-1">
                  {locale === "fr"
                    ? "Confirmez sur votre telephone pour finaliser la cotisation."
                    : "Confirm on your phone to complete the contribution."}
                </p>
              </div>
              <div className="bg-muted rounded-lg py-2 px-4 inline-block">
                <span className="text-2xl font-bold text-primary">
                  {amountXAF.toLocaleString(locale)} XAF
                </span>
              </div>
              <div className="text-lg font-mono font-bold text-slate-700 dark:text-slate-200">
                <Clock className="h-4 w-4 inline-block mr-1 mb-0.5" />
                {formatCountdown(secondsLeft)}
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-3">
                <Smartphone className="h-4 w-4 text-blue-600" />
                <span className="font-semibold text-blue-800 dark:text-blue-200 text-sm">
                  {carrier === "MTN"
                    ? "MTN MoMo"
                    : carrier === "ORANGE"
                      ? "Orange Money"
                      : locale === "fr"
                        ? "Operateur"
                        : "Carrier"}
                </span>
              </div>
              <div className="bg-blue-100 dark:bg-blue-900/50 rounded-lg px-4 py-3">
                <span className="font-mono text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {ussdCode}
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-sm text-amber-800 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />
            <span>
              {locale === "fr"
                ? "Ne fermez pas cette page avant confirmation du paiement."
                : "Do not close this page until the payment is confirmed."}
            </span>
          </div>
        </div>
      </div>
    );
  }

  const success = status === "SUCCESS";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-6 text-center space-y-6">
          <div className="flex justify-center">
            {success ? (
              <CheckCircle className="h-16 w-16 text-green-500" />
            ) : (
              <XCircle className="h-16 w-16 text-red-500" />
            )}
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold">
              {success
                ? locale === "fr"
                  ? "Paiement confirme"
                  : "Payment confirmed"
                : locale === "fr"
                  ? "Paiement echoue"
                  : "Payment failed"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {success
                ? locale === "fr"
                  ? "Votre cotisation sera visible dans quelques instants."
                  : "Your contribution will appear in a few moments."
                : locale === "fr"
                  ? "Veuillez reessayer avec un autre moyen si necessaire."
                  : "Please try again with another method if needed."}
            </p>
          </div>

          <Button
            onClick={() => router.push(`/${locale}/dashboard/contributions`)}
          >
            {locale === "fr" ? "Voir les cotisations" : "View contributions"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
