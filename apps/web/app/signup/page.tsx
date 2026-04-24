"use client";

import { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
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
import { useTranslations } from "@/lib/translations";
import { toast } from "sonner";
import { Zap, Mail, Lock, AlertCircle, User } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { status } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const firstSegment = pathname.split("/").filter(Boolean)[0] || "en";
  const locale =
    firstSegment === "fr" || firstSegment === "en" ? firstSegment : "en";
  const t = useTranslations(locale);

  useEffect(() => {
    if (status === "authenticated") {
      router.push(`/${locale}/dashboard`);
    }
  }, [status, locale, router]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!fullName || !email || !password || !confirmPassword) {
      const message = t("errors.allFieldsRequired") || "All fields are required";
      setError(message);
      toast.error(message);
      return;
    }

    if (password !== confirmPassword) {
      const message = t("errors.passwordsDoNotMatch") || "Passwords do not match";
      setError(message);
      toast.error(message);
      return;
    }

    if (password.length < 8) {
      const message = t("errors.passwordTooShort") || "Password must be at least 8 characters";
      setError(message);
      toast.error(message);
      return;
    }

    setIsLoading(true);

    try {
      // Call signup endpoint
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, fullName }),
      });

      if (!response.ok) {
        const data = await response.json();
        const message = data.message || t("errors.signupFailed") || "Signup failed";
        setError(message);
        toast.error(message);
        setIsLoading(false);
        return;
      }

      toast.success(t("toasts.signupSuccess") || "Account created successfully!");

      // Auto-login after signup
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

      router.push(`/${locale}/dashboard`);
    } catch (err) {
      setIsLoading(false);
      const message = t("errors.signupFailed") || "An error occurred during signup";
      setError(message);
      toast.error(message);
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
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-linear-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-foreground">
                {t("branding.appName")}
              </span>
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

      {/* Right Side - Signup Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-linear-to-br from-background via-background to-muted/30">
        <Card className="w-full max-w-md border-border/50 shadow-2xl bg-card/80 backdrop-blur">
          <CardHeader className="text-center space-y-4 pb-2">
            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 bg-linear-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-foreground">
                {t("branding.appName")}
              </span>
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">
              {t("auth.signup") || "Create Account"}
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              {t("auth.signupDescription") || "Join our solar energy cooperative"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <form onSubmit={handleSignup} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <label
                  htmlFor="fullName"
                  className="text-sm font-medium text-foreground"
                >
                  {t("common.fullName") || "Full Name"}
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder={t("auth.fullNamePlaceholder") || "Enter your full name"}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10 bg-input border-border text-foreground"
                    required
                  />
                </div>
              </div>

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

              <div className="space-y-2">
                <label
                  htmlFor="confirmPassword"
                  className="text-sm font-medium text-foreground"
                >
                  {t("auth.confirmPassword") || "Confirm Password"}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder={t("auth.confirmPasswordPlaceholder") || "Confirm your password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 bg-input border-border text-foreground"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading || !fullName || !email || !password || !confirmPassword}
                className="w-full bg-linear-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-lg"
              >
                {isLoading && <Spinner className="mr-2" />}
                {t("auth.createAccount") || "Create Account"}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/30" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card/80 px-2 text-muted-foreground">
                  {t("auth.or") || "Or"}
                </span>
              </div>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              {t("auth.alreadyHaveAccount") || "Already have an account?"}{" "}
              <Link
                href={`/login`}
                className="text-primary hover:text-primary/80 font-semibold transition-colors"
              >
                {t("common.login")}
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
