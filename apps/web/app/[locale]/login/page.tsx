"use client";

import { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Locale, useTranslations } from "@/lib/translations";
import { toast } from "sonner";
import { Mail, Lock, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const { status, data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const t = useTranslations(locale as Locale);

  useEffect(() => {
    if (status === "authenticated") {
      if (session?.user?.isPlatformAdmin) {
        router.push(`/${locale}/admin`);
      } else {
        router.push(`/${locale}/dashboard`);
      }
    }
  }, [status, session, locale, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setIsLoading(false);

    if (result?.error) {
      const message = t("errors.invalidCredentials");
      setError(message);
      toast.error(message);
      return;
    }

    toast.success(t("toasts.loginSuccess"));

    const { getSession } = await import("next-auth/react");
    const session = await getSession();
    if (session?.user?.isPlatformAdmin) {
      router.push(`/${locale}/admin`);
    } else {
      router.push(`/${locale}/dashboard`);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Image */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <Image
          src="/images/hero-solar.jpg"
          alt="Solar community"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-linear-to-r from-background via-background/50 to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="max-w-lg space-y-6">
            <div className="flex items-center gap-3.5">
              <Image
                src="/logo/coopenergie-logo-full.png"
                alt={t("branding.appName")}
                width={728}
                height={179}
                className="h-10.5 w-auto drop-shadow-[0_1px_0_rgba(15,23,42,0.08)] dark:drop-shadow-[0_1px_0_rgba(248,250,252,0.12)]"
                priority
              />
            </div>
            <h1 className="text-4xl font-bold text-foreground leading-tight">
              <span className="text-gradient">{t("auth.heroTextLine1")}</span>
              <br />
              <span className="text-gradient-green">
                {t("auth.heroTextLine2")}
              </span>
            </h1>
            <p className="text-lg text-muted-foreground">
              {t("auth.heroDescription")}
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-linear-to-br from-background via-background to-muted/30">
        <Card className="w-full max-w-md border-border/50 shadow-2xl bg-card/80 backdrop-blur">
          <CardHeader className="text-center space-y-4 pb-2">
            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center justify-center gap-2.5 mb-4">
              <Image
                src="/logo/coopenergie-logo-icon.png"
                alt={t("branding.appName")}
                width={184}
                height={172}
                className="h-10 w-auto"
                priority
              />
              <Image
                src="/logo/coopenergie-logo-full.png"
                alt={t("branding.appName")}
                width={728}
                height={179}
                className="h-8 w-auto"
                priority
              />
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">
              {t("auth.title")}
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              {t("auth.enterCredentials")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-sm font-medium text-foreground"
                >
                  {t("common.email")}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder={t("auth.emailPlaceholder")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-input border-border text-foreground"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-foreground"
                >
                  {t("common.password")}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder={t("auth.passwordPlaceholder")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 bg-input border-border text-foreground"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading || !email || !password}
                className="w-full bg-linear-to-r from-primary to-[#1D4ED8] hover:from-[#1D4ED8] hover:to-[#1E40AF] text-white shadow-lg"
              >
                {isLoading && <Spinner className="mr-2" />}
                {t("common.login")}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/30" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card/80 px-2 text-muted-foreground">
                  {t("auth.or")}
                </span>
              </div>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              {t("auth.noAccount")}{" "}
              <Link
                href={`/${locale}/signup`}
                className="text-primary hover:text-primary/80 font-semibold transition-colors"
              >
                {t("auth.signup")}
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
