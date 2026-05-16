import { Link } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";

import PressableScale from "@/components/pressable-scale";
import { ScreenReveal } from "@/components/screen-reveal";
import { api } from "@/lib/api";
import { useMobileTranslations } from "@/lib/translations";

type LegalPayload = {
  terms?: {
    title?: string;
    paragraphs?: string[];
  };
};

export default function TermsScreen() {
  const { t, locale } = useMobileTranslations();
  const [legal, setLegal] = useState<LegalPayload | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadLegal() {
      try {
        const data = await api.get<LegalPayload>(
          `/public/legal?locale=${locale}`,
        );
        if (mounted) {
          setLegal(data);
        }
      } catch {
        // Keep translation fallback.
      }
    }

    void loadLegal();

    return () => {
      mounted = false;
    };
  }, [locale]);

  return (
    <ScreenReveal className="bg-[#EAF4EA] p-4">
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        <View className="rounded-2xl border border-[#DDEBDD] bg-white p-4">
          <Text className="text-[#1B5E20] text-xl font-bold">
            {legal?.terms?.title || t("legal.termsHeading")}
          </Text>
          <Text className="mt-3 text-slate-700 leading-6">
            {legal?.terms?.paragraphs?.[0] || t("legal.termsBody1")}
          </Text>
          <Text className="mt-3 text-slate-700 leading-6">
            {legal?.terms?.paragraphs?.[1] || t("legal.termsBody2")}
          </Text>
          <Text className="mt-3 text-slate-700 leading-6">
            {legal?.terms?.paragraphs?.[2] || t("legal.termsBody3")}
          </Text>

          <Link href="/(auth)/privacy" asChild>
            <PressableScale className="mt-5 rounded-xl border border-[#1B5E20] px-4 py-3 items-center">
              <Text className="text-[#1B5E20] font-semibold">
                {t("auth.privacyTitle")}
              </Text>
            </PressableScale>
          </Link>
        </View>
      </ScrollView>
    </ScreenReveal>
  );
}
