import { useQuery } from "@apollo/client";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import PressableScale from "@/components/pressable-scale";
import { ScreenReveal } from "@/components/screen-reveal";
import { StarRatingMobile } from "@/components/shared/StarRatingMobile";
import { GET_VENDORS } from "@/lib/graphql/queries/vendors";
import { useMobileTranslations } from "@/lib/translations";

type VendorProduct = {
  id: string;
  title: string;
  priceXAF: number;
  unit?: string | null;
};

type VendorItem = {
  id: string;
  businessName: string;
  logoUrl?: string | null;
  city?: string | null;
  avgRating?: number | null;
  totalReviews?: number | null;
  products: VendorProduct[];
};

type VendorsQueryData = {
  vendors: VendorItem[];
};

type VendorFilter = "ALL" | "RATING_4" | "MY_CITY" | "PRICE_ASC";

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

function formatPriceRange(products: VendorProduct[], emptyLabel: string) {
  if (!products.length) {
    return emptyLabel;
  }

  const sorted = products
    .map((product) => product.priceXAF)
    .filter((value) => Number.isFinite(value))
    .sort((left, right) => left - right);

  if (!sorted.length) {
    return emptyLabel;
  }

  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  if (min === max) {
    return `${min.toLocaleString()} FCFA`;
  }

  return `${min.toLocaleString()} - ${max.toLocaleString()} FCFA`;
}

export default function VendorsBrowserScreen() {
  const { t } = useMobileTranslations();
  const router = useRouter();
  const params = useLocalSearchParams<{ select?: string; city?: string }>();

  const isSelectionMode = params.select === "1";
  const preferredCity =
    typeof params.city === "string" && params.city.trim().length > 0
      ? params.city.trim().toLowerCase()
      : "";

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<VendorFilter>("ALL");

  const { data, loading, refetch, networkStatus } = useQuery<VendorsQueryData>(GET_VENDORS, {
    variables: {
      search: search.trim() || null,
      sortBy: "rankScore",
      city: null,
      minRating: null,
    },
    notifyOnNetworkStatusChange: true,
    fetchPolicy: "cache-and-network",
  });

  const filteredVendors = useMemo(() => {
    let items = [...(data?.vendors ?? [])];

    if (activeFilter === "RATING_4") {
      items = items.filter((vendor) => (vendor.avgRating ?? 0) >= 4);
    }

    if (activeFilter === "MY_CITY" && preferredCity) {
      items = items.filter(
        (vendor) => (vendor.city ?? "").trim().toLowerCase() === preferredCity,
      );
    }

    if (activeFilter === "PRICE_ASC") {
      items = items.sort((left, right) => {
        const leftMin =
          left.products
            .map((product) => product.priceXAF)
            .filter((value) => Number.isFinite(value))
            .sort((a, b) => a - b)[0] ?? Number.MAX_SAFE_INTEGER;
        const rightMin =
          right.products
            .map((product) => product.priceXAF)
            .filter((value) => Number.isFinite(value))
            .sort((a, b) => a - b)[0] ?? Number.MAX_SAFE_INTEGER;

        return leftMin - rightMin;
      });
    }

    return items;
  }, [activeFilter, data?.vendors, preferredCity]);

  const isRefreshing = networkStatus === 4;

  return (
    <ScreenReveal className="bg-[#F5F8F5] p-4">
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder={t("vendorsBrowser.searchPlaceholder")}
        className="bg-white border border-[#CFE3CF] rounded-xl px-4 py-3 mb-3"
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
        <View className="flex-row gap-2">
          {(
            [
              ["ALL", t("vendorsBrowser.filters.all")],
              ["RATING_4", t("vendorsBrowser.filters.rating4")],
              ["MY_CITY", t("vendorsBrowser.filters.myCity")],
              ["PRICE_ASC", t("vendorsBrowser.filters.priceAsc")],
            ] as Array<[VendorFilter, string]>
          ).map(([value, label]) => {
            const isActive = activeFilter === value;

            return (
              <PressableScale
                key={value}
                className={`rounded-full px-4 py-2 border ${
                  isActive
                    ? "bg-[#1B5E20] border-[#1B5E20]"
                    : "bg-white border-[#CFE3CF]"
                }`}
                onPress={() => setActiveFilter(value)}
              >
                <Text className={`font-semibold text-xs ${isActive ? "text-white" : "text-[#1B5E20]"}`}>
                  {label}
                </Text>
              </PressableScale>
            );
          })}
        </View>
      </ScrollView>

      {loading && !data?.vendors ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#1B5E20" />
        </View>
      ) : (
        <FlatList
          data={filteredVendors}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 10, paddingBottom: 24 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              tintColor="#1B5E20"
              onRefresh={() => {
                void refetch();
              }}
            />
          }
          renderItem={({ item }) => (
            <View className="bg-white border border-[#DDEBDD] rounded-2xl px-4 py-3">
              <View className="flex-row items-center">
                {item.logoUrl ? (
                  <Image
                    source={{ uri: item.logoUrl }}
                    className="w-12 h-12 rounded-xl mr-3"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="w-12 h-12 rounded-xl mr-3 bg-[#E6F0E6] items-center justify-center">
                    <Text className="text-[#1B5E20] font-bold text-xs">{getInitials(item.businessName)}</Text>
                  </View>
                )}

                <View className="flex-1">
                  <Text className="text-[#1B5E20] font-semibold">{item.businessName}</Text>
                  <Text className="text-slate-500 text-xs mt-0.5">{item.city || "-"}</Text>
                  <View className="flex-row items-center gap-2 mt-1">
                    <StarRatingMobile rating={item.avgRating ?? 0} size={14} />
                    <Text className="text-slate-600 text-xs">
                      {(item.avgRating ?? 0).toFixed(1)} ({item.totalReviews ?? 0})
                    </Text>
                  </View>
                  <Text className="text-[#1B5E20] text-xs mt-1 font-semibold">
                    {formatPriceRange(item.products, t("vendorsBrowser.noProductPrice"))}
                  </Text>
                </View>
              </View>

              <PressableScale
                className="mt-3 rounded-xl border border-[#1B5E20] px-3 py-2"
                onPress={() => {
                  router.push({
                    pathname: "/(dashboard)/vendors/[id]",
                    params: {
                      id: item.id,
                      select: isSelectionMode ? "1" : "0",
                    },
                  });
                }}
              >
                <Text className="text-center text-[#1B5E20] font-semibold">
                  {t("vendorsBrowser.view")}
                </Text>
              </PressableScale>
            </View>
          )}
          ListEmptyComponent={
            <View className="rounded-xl bg-white border border-[#DDEBDD] px-4 py-4">
              <Text className="text-slate-600">{t("proposals.vendorNoData")}</Text>
            </View>
          }
        />
      )}
    </ScreenReveal>
  );
}
