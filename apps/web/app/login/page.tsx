"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/en/login");
  }, [router]);
  return null;
}
