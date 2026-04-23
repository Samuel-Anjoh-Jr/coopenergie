"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to French (default locale)
    router.push("/fr");
  }, [router]);

  return null;
}
