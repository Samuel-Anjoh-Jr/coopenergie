// This file intentionally redirects to the locale-aware signup page.
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SignupRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/en/signup");
  }, [router]);
  return null;
}
