"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { restClient } from "@/lib/rest-client";
import { Locale, useTranslations } from "@/lib/translations";

type PlatformSettings = {
  appStoreUrl?: string | null;
  playStoreUrl?: string | null;
};

function qrFromUrl(value: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(value)}`;
}

export default function MobileStoreSettingsPage() {
  const params = useParams();
  const locale = (params?.locale as Locale) || "en";
  const t = useTranslations(locale);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [appStoreUrl, setAppStoreUrl] = useState("");
  const [playStoreUrl, setPlayStoreUrl] = useState("");

  useEffect(() => {
    async function fetchSettings() {
      try {
        const data = await restClient.get<PlatformSettings>("/admin/settings");
        setAppStoreUrl(data.appStoreUrl || "");
        setPlayStoreUrl(data.playStoreUrl || "");
      } catch (error) {
        console.error("Failed to fetch settings:", error);
        setErrorMessage("Impossible de charger les paramètres");
      } finally {
        setIsLoading(false);
      }
    }

    void fetchSettings();
  }, []);

  const appPreview = useMemo(() => {
    return appStoreUrl.trim()
      ? qrFromUrl(appStoreUrl.trim())
      : qrFromUrl("https://apps.apple.com");
  }, [appStoreUrl]);

  const playPreview = useMemo(() => {
    return playStoreUrl.trim()
      ? qrFromUrl(playStoreUrl.trim())
      : qrFromUrl("https://play.google.com/store");
  }, [playStoreUrl]);

  async function handleSave() {
    try {
      setIsSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      await restClient.patch("/admin/settings", {
        appStoreUrl: appStoreUrl.trim() || null,
        playStoreUrl: playStoreUrl.trim() || null,
      });

      setSuccessMessage("Liens stores enregistres avec succes");
    } catch (error) {
      console.error("Failed to save settings:", error);
      setErrorMessage("Erreur lors de l'enregistrement des liens stores");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p>Chargement des parametres...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Parametres des stores mobiles
        </h1>

        {successMessage ? (
          <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded">
            <p className="text-green-700">{successMessage}</p>
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded">
            <p className="text-red-700">{errorMessage}</p>
          </div>
        ) : null}

        <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
          <div className="p-6 space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Liens des applications
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL Apple App Store (iOS)
              </label>
              <input
                type="url"
                value={appStoreUrl}
                onChange={(e) => setAppStoreUrl(e.target.value)}
                placeholder="https://apps.apple.com/..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL Google Play Store (Android)
              </label>
              <input
                type="url"
                value={playStoreUrl}
                onChange={(e) => setPlayStoreUrl(e.target.value)}
                placeholder="https://play.google.com/store/apps/details?id=..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              📲 Codes QR pour téléchargement
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="rounded-lg border border-gray-200 p-4">
                <p className="font-semibold text-gray-800 mb-3">
                  Apple App Store
                </p>
                <img
                  src={appPreview}
                  alt="QR App Store"
                  width={180}
                  height={180}
                  className="rounded border border-gray-200"
                />
                {!appStoreUrl.trim() ? (
                  <p className="text-xs text-amber-700 mt-2">
                    Placeholder affiche tant que non configure
                  </p>
                ) : null}
              </div>

              <div className="rounded-lg border border-gray-200 p-4">
                <p className="font-semibold text-gray-800 mb-3">
                  Google Play Store
                </p>
                <img
                  src={playPreview}
                  alt="QR Play Store"
                  width={180}
                  height={180}
                  className="rounded border border-gray-200"
                />
                {!playStoreUrl.trim() ? (
                  <p className="text-xs text-amber-700 mt-2">
                    Placeholder affiche tant que non configure
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="p-6 bg-gray-50 flex justify-end">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition font-medium"
            >
              {isSaving ? "Enregistrement..." : "💾 Enregistrer"}
            </button>
          </div>
        </div>

        <div className="mt-8 space-y-4">
          <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
            <h3 className="font-semibold text-blue-900 mb-2">
              📋 Recommandations
            </h3>
            <ul className="text-sm text-blue-900 space-y-1">
              <li>✅ Les URL doivent être complètes (https://...)</li>
              <li>✅ Les codes QR doivent être en PNG ou JPEG</li>
              <li>✅ Taille recommandée des QR: 200x200px minimum</li>
              <li>
                ✅ Les QR codes seront affichés sur la landing page principale
              </li>
            </ul>
          </div>

          <div className="p-4 bg-amber-50 border-l-4 border-amber-500 rounded">
            <h3 className="font-semibold text-amber-900 mb-2">🔒 Accès</h3>
            <p className="text-sm text-amber-900">
              Cette page est accessible uniquement aux administrateurs
              plateforme (PLATFORM_ADMIN)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
