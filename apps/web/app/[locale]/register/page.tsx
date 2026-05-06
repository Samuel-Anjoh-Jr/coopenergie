"use client";

import { useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

export default function RegisterAliasPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params.locale as string) || "en";
  const invitationToken = searchParams.get("invitationToken");

  useEffect(() => {
    const target = invitationToken
      ? `/${locale}/signup?invitationToken=${encodeURIComponent(invitationToken)}`
      : `/${locale}/signup`;
    router.replace(target);
  }, [invitationToken, locale, router]);

  return null;
}
