"use client";

import { useEffect } from "react";

import { type WatchQueryFetchPolicy, useQuery } from "@apollo/client";

import { useActiveCoop } from "@/lib/coop-context";
import { GET_MY_COOPERATIVES } from "@/lib/graphql/queries/cooperative";

type CooperativeSummary = {
  id: string;
  name: string;
  slug?: string;
  targetAmountXAF?: number | null;
  confirmedBalanceXAF?: number | null;
  vaultAddress?: string | null;
  membership?: { role?: string | null } | null;
};

type UseSelectedCooperativeOptions = {
  skip?: boolean;
  pollInterval?: number;
  fetchPolicy?: WatchQueryFetchPolicy;
};

export function useSelectedCooperative(
  options: UseSelectedCooperativeOptions = {},
) {
  const { activeCoopId, hasHydrated, setActiveCoopId } = useActiveCoop();
  const { data, loading, refetch } = useQuery<{ myCooperatives: CooperativeSummary[] }>(
    GET_MY_COOPERATIVES,
    {
      fetchPolicy: options.fetchPolicy ?? "cache-and-network",
      skip: options.skip,
      pollInterval: options.pollInterval,
    },
  );

  const allCoops = data?.myCooperatives ?? [];

  useEffect(() => {
    if (options.skip || !hasHydrated || allCoops.length === 0) {
      return;
    }

    if (activeCoopId && allCoops.some((coop) => coop.id === activeCoopId)) {
      return;
    }

    setActiveCoopId(allCoops[0].id);
  }, [activeCoopId, allCoops, hasHydrated, options.skip, setActiveCoopId]);

  const selectedCoop = !hasHydrated
    ? null
    : allCoops.find((coop) => coop.id === activeCoopId) ?? allCoops[0] ?? null;

  const isResolvingSelection =
    !options.skip &&
    (!hasHydrated || (loading && allCoops.length === 0) || (allCoops.length > 0 && !selectedCoop));

  return {
    allCoops,
    selectedCoop,
    activeCoopId: selectedCoop?.id ?? null,
    userRole: selectedCoop?.membership?.role ?? null,
    hasHydrated,
    isResolvingSelection,
    loadingCoops: loading,
    refetchMyCooperatives: refetch,
    setActiveCoopId,
  };
}