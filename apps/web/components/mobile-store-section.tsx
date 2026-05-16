"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { restClient } from "@/lib/rest-client";
import { useTranslations } from "@/lib/translations";

type MobileStoreConfig = {
  appStoreUrl?: string | null;
  playStoreUrl?: string | null;
};

const DEFAULT_APP_STORE_URL = "https://apps.apple.com";
const DEFAULT_PLAY_STORE_URL = "https://play.google.com/store";

function buildQrImageUrl(value: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(value)}`;
}

export function MobileStoreSection() {
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  const t = useTranslations(locale);
  const [config, setConfig] = useState<MobileStoreConfig>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchConfig() {
      try {
        const settings = await restClient.get<MobileStoreConfig>(
          "/public/mobile-stores",
        );
        setConfig(settings || {});
      } catch {
        setConfig({});
      } finally {
        setIsLoading(false);
      }
    }

    void fetchConfig();
  }, []);

  const appStoreUrl = config.appStoreUrl?.trim() || DEFAULT_APP_STORE_URL;
  const playStoreUrl = config.playStoreUrl?.trim() || DEFAULT_PLAY_STORE_URL;

  const appStorePlaceholder = !config.appStoreUrl?.trim();
  const playStorePlaceholder = !config.playStoreUrl?.trim();

  const appQrUrl = useMemo(() => buildQrImageUrl(appStoreUrl), [appStoreUrl]);
  const playQrUrl = useMemo(
    () => buildQrImageUrl(playStoreUrl),
    [playStoreUrl],
  );

  if (isLoading) {
    return (
      <section className="py-12 bg-linear-to-r from-blue-50 to-green-50">
        <div className="max-w-6xl mx-auto px-4 text-center text-gray-600">
          {t("mobileStore.loading")}
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 bg-linear-to-r from-blue-50 to-green-50">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">
          {t("mobileStore.heading")}
        </h2>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="flex flex-col items-center p-6 bg-white rounded-lg shadow-lg hover:shadow-xl transition">
            <div className="mb-4">
              <img
                src={appQrUrl}
                alt={t("mobileStore.appleQrAlt")}
                width={180}
                height={180}
                className="rounded-lg border-2 border-gray-200"
              />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-800">
              {t("mobileStore.appleTitle")}
            </h3>
            <p className="text-gray-600 text-center mb-1">
              {t("mobileStore.appleDescription")}
            </p>
            {appStorePlaceholder ? (
              <p className="text-xs text-amber-700 mb-4">
                {t("mobileStore.placeholder")}
              </p>
            ) : (
              <p className="text-xs text-emerald-700 mb-4">
                {t("mobileStore.configuredByAdmin")}
              </p>
            )}
            <Link
              href={appStoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition"
            >
              {t("mobileStore.appleButton")}
            </Link>
          </div>

          <div className="flex flex-col items-center p-6 bg-white rounded-lg shadow-lg hover:shadow-xl transition">
            <div className="mb-4">
              <img
                src={playQrUrl}
                alt={t("mobileStore.playQrAlt")}
                width={180}
                height={180}
                className="rounded-lg border-2 border-gray-200"
              />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-800">
              {t("mobileStore.playTitle")}
            </h3>
            <p className="text-gray-600 text-center mb-1">
              {t("mobileStore.playDescription")}
            </p>
            {playStorePlaceholder ? (
              <p className="text-xs text-amber-700 mb-4">
                {t("mobileStore.placeholder")}
              </p>
            ) : (
              <p className="text-xs text-emerald-700 mb-4">
                {t("mobileStore.configuredByAdmin")}
              </p>
            )}
            <Link
              href={playStoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              {t("mobileStore.playButton")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
