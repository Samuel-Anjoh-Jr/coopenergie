"use client";

import { useParams } from "next/navigation";
import { Locale, useTranslations } from "@/lib/translations";
import React, { useEffect, useState } from "react";

export default function CoopAdminHealthPage() {
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  const t = useTranslations(locale as Locale);
  const [data, setData] = useState<any[]>([]);
  useEffect(() => {
    fetch("/api/admin/cooperatives/admin-key-health", { cache: "no-store" })
      .then((res) => res.json())
      .then(setData);
  }, []);

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">
        {t("admin.coopAdminHealth.title")}
      </h1>
      <table className="min-w-full border text-sm">
        <thead>
          <tr>
            <th className="border px-2 py-1">
              {t("admin.coopAdminHealth.cooperative")}
            </th>
            <th className="border px-2 py-1">
              {t("admin.coopAdminHealth.vaultAdminAddress")}
            </th>
            <th className="border px-2 py-1">
              {t("admin.coopAdminHealth.status")}
            </th>
            <th className="border px-2 py-1">
              {t("admin.coopAdminHealth.message")}
            </th>
            <th className="border px-2 py-1">
              {t("admin.coopAdminHealth.user")}
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((coop: any) => (
            <tr
              key={coop.id}
              className={
                coop.health === "ok"
                  ? "bg-green-50"
                  : coop.health === "missing-key"
                    ? "bg-yellow-50"
                    : "bg-red-50"
              }
            >
              <td className="border px-2 py-1">{coop.name}</td>
              <td className="border px-2 py-1 font-mono">
                {coop.vaultAdminAddress || "-"}
              </td>
              <td className="border px-2 py-1 font-bold">
                {coop.health === "ok"
                  ? t("admin.coopAdminHealth.ok")
                  : coop.health === "missing-key"
                    ? t("admin.coopAdminHealth.missingKey")
                    : coop.health === "no-vault-admin-address"
                      ? t("admin.coopAdminHealth.noVaultAdminAddress")
                      : coop.health === "no-local-user"
                        ? t("admin.coopAdminHealth.noLocalUser")
                        : coop.health}
              </td>
              <td className="border px-2 py-1">{coop.message}</td>
              <td className="border px-2 py-1">
                {coop.user ? (
                  <span>
                    {coop.user.name} <br />{" "}
                    <span className="text-xs">{coop.user.email}</span>
                  </span>
                ) : (
                  "-"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
