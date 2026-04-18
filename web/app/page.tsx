"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // Always redirect to homepage, not login
    router.push("/en");
  }, [router]);

  return null;
}
