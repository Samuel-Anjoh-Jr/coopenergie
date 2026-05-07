"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye } from "lucide-react";

import { API_URL } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTranslations } from "@/lib/translations";

type MonetisationSettings = {
  vendorOneTimeFeeXAF?: number;
};

type VendorRegisterResponse = {
  paymentRequired?: boolean;
  platformSettings?: MonetisationSettings;
};

type LoginResponse = {
  token?: string;
};

type VendorDashboardResponse = {
  accountStatus?: string;
};

function formatXaf(value: number) {
  return new Intl.NumberFormat("fr-CM", {
    style: "currency",
    currency: "XAF",
    maximumFractionDigits: 0,
  }).format(value);
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export default function VendorSignupPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params.locale as string) || "fr";
  const t = useTranslations(locale);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPasswordPreview, setShowPasswordPreview] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [loadingFee, setLoadingFee] = useState(false);
  const [feeXaf, setFeeXaf] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authToken, setAuthToken] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentPhone, setPaymentPhone] = useState("");
  const [isPaying, setIsPaying] = useState(false);

  const loadFee = async () => {
    try {
      setLoadingFee(true);
      const response = await fetch(`${API_URL}/api/v1/public/monetisation`);
      if (!response.ok) {
        return;
      }
      const data = (await response.json()) as MonetisationSettings;
      setFeeXaf(Number(data.vendorOneTimeFeeXAF ?? 0));
    } catch {
      // Keep zero fee fallback when endpoint is unavailable.
    } finally {
      setLoadingFee(false);
    }
  };

  const pollVendorActivation = async (token: string) => {
    const deadline = Date.now() + 5 * 60 * 1000;

    while (Date.now() < deadline) {
      const response = await fetch(`${API_URL}/api/v1/vendors/dashboard/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const dashboard = (await response.json()) as VendorDashboardResponse;
        const status = dashboard.accountStatus;

        if (status === "ACTIVE" || status === "SUBSCRIPTION_EXPIRED") {
          toast.success(t("vendorSignup.feedback.accountActive"));
          router.push(`/${locale}/vendor-dashboard`);
          return;
        }
      }

      await sleep(3000);
    }

    toast.error(t("vendorSignup.feedback.paymentPending"));
  };

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!acceptTerms) {
      toast.error(t("vendorSignup.feedback.acceptTermsRequired"));
      return;
    }

    setIsSubmitting(true);

    try {
      const registrationResponse = await fetch(
        `${API_URL}/api/v1/vendors/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            password,
            businessName: businessName.trim(),
            description: description.trim(),
            city: city.trim(),
            country: "CM",
            whatsappNumber: whatsappNumber.trim() || undefined,
            contactEmail: email.trim(),
          }),
        },
      );

      const registrationData = (await registrationResponse.json()) as
        | VendorRegisterResponse
        | { message?: string };

      if (!registrationResponse.ok) {
        toast.error(
          (registrationData as { message?: string }).message ||
            t("vendorSignup.feedback.registrationFailed"),
        );
        return;
      }

      const loginResult = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });

      if (loginResult?.error) {
        toast.error(t("vendorSignup.feedback.accountCreatedLoginRequired"));
        router.push(`/${locale}/login`);
        return;
      }

      const tokenResponse = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const tokenData = (await tokenResponse.json()) as LoginResponse;
      if (!tokenResponse.ok || !tokenData.token) {
        toast.error(t("vendorSignup.feedback.preparePaymentFailed"));
        return;
      }

      setAuthToken(tokenData.token);

      const registrationPayload = registrationData as VendorRegisterResponse;
      const feeFromSettings = Number(
        registrationPayload.platformSettings?.vendorOneTimeFeeXAF ?? feeXaf,
      );
      const shouldPay =
        Boolean(registrationPayload.paymentRequired) && feeFromSettings > 0;

      if (!shouldPay) {
        router.push(`/${locale}/vendor-dashboard`);
        return;
      }

      setFeeXaf(feeFromSettings);
      setPaymentPhone((current) => current || whatsappNumber.trim());
      setShowPaymentModal(true);
      toast.info(t("vendorSignup.feedback.completePaymentPrompt"));
    } catch {
      toast.error(t("vendorSignup.feedback.networkError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayment = async () => {
    if (!authToken) {
      toast.error(t("vendorSignup.feedback.invalidSession"));
      return;
    }

    if (!paymentPhone.trim()) {
      toast.error(t("vendorSignup.feedback.phoneRequired"));
      return;
    }

    try {
      setIsPaying(true);

      const paymentResponse = await fetch(
        `${API_URL}/api/v1/vendors/payment/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            phoneNumber: paymentPhone.trim(),
          }),
        },
      );

      const paymentData = (await paymentResponse.json()) as {
        message?: string;
      };

      if (!paymentResponse.ok) {
        toast.error(
          paymentData.message ||
            t("vendorSignup.feedback.paymentNotInitialized"),
        );
        return;
      }

      toast.success(t("vendorSignup.feedback.paymentStarted"));
      setShowPaymentModal(false);
      await pollVendorActivation(authToken);
    } catch {
      toast.error(t("vendorSignup.feedback.paymentInitError"));
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-background to-muted/40 py-12">
      <div className="mx-auto max-w-2xl px-4">
        <Card>
          <CardHeader>
            <CardTitle>{t("vendorSignup.title")}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {t("vendorSignup.subtitle")}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("vendorSignup.activationFeeLabel")}{" "}
              {loadingFee ? t("vendorSignup.loadingFee") : formatXaf(feeXaf)}
            </p>
            <Button
              type="button"
              variant="outline"
              className="w-fit"
              onClick={() => void loadFee()}
            >
              {t("vendorSignup.reloadFees")}
            </Button>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleRegister}>
              <Input
                placeholder={t("vendorSignup.fields.fullName")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <Input
                placeholder={t("vendorSignup.fields.email")}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <div className="relative">
                <Input
                  placeholder={t("vendorSignup.fields.password")}
                  type={showPasswordPreview ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  aria-label="Hold to preview password"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onMouseDown={() => setShowPasswordPreview(true)}
                  onMouseUp={() => setShowPasswordPreview(false)}
                  onMouseLeave={() => setShowPasswordPreview(false)}
                  onTouchStart={() => setShowPasswordPreview(true)}
                  onTouchEnd={() => setShowPasswordPreview(false)}
                  onTouchCancel={() => setShowPasswordPreview(false)}
                  onKeyDown={(event) => {
                    if (event.key === " " || event.key === "Enter") {
                      event.preventDefault();
                      setShowPasswordPreview(true);
                    }
                  }}
                  onKeyUp={(event) => {
                    if (event.key === " " || event.key === "Enter") {
                      setShowPasswordPreview(false);
                    }
                  }}
                  onBlur={() => setShowPasswordPreview(false)}
                >
                  <Eye className="h-4 w-4" />
                </button>
              </div>
              <Input
                placeholder={t("vendorSignup.fields.businessName")}
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                required
              />
              <Input
                placeholder={t("vendorSignup.fields.city")}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
              />
              <Input
                placeholder={t("vendorSignup.fields.whatsapp")}
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
              />
              <textarea
                placeholder={t("vendorSignup.fields.description")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-28 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                required
              />

              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  {t("vendorSignup.acceptTermsPrefix")}{" "}
                  <Link
                    href={`/${locale}/vendor-terms`}
                    className="text-primary underline"
                  >
                    {t("vendorSignup.termsLink")}
                  </Link>
                  .
                </span>
              </label>

              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting
                  ? t("vendorSignup.submitting")
                  : t("vendorSignup.submit")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {showPaymentModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>{t("vendorSignup.paymentModal.title")}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {t("vendorSignup.paymentModal.amount")} {formatXaf(feeXaf)}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder={t("vendorSignup.paymentModal.phonePlaceholder")}
                value={paymentPhone}
                onChange={(e) => setPaymentPhone(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowPaymentModal(false);
                    router.push(`/${locale}/vendor-dashboard`);
                  }}
                  disabled={isPaying}
                >
                  {t("vendorSignup.paymentModal.later")}
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  onClick={() => void handlePayment()}
                  disabled={isPaying}
                >
                  {isPaying
                    ? t("vendorSignup.paymentModal.initializing")
                    : t("vendorSignup.paymentModal.payNow")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
