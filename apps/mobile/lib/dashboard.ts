import { gql, useQuery } from "@apollo/client";
import { useRouter } from "expo-router";
import { useEffect, useMemo } from "react";

import { cooperativeStorage, tokenStorage } from "@/lib/storage";

const MY_COOPERATIVES_QUERY = gql`
  query MobileMyCooperatives {
    myCooperatives {
      id
      name
      balance
      vaultAddress
      membership {
        role
      }
    }
  }
`;

type CooperativeSummary = {
  id: string;
  name: string;
  balance?: number;
  vaultAddress?: string | null;
  membership?: {
    role?: string;
  } | null;
};

export function useDashboardAuth() {
  const router = useRouter();
  const token = tokenStorage.get();

  useEffect(() => {
    if (!token) {
      router.replace("/(auth)/login");
    }
  }, [router, token]);

  return {
    token,
    isAuthenticated: !!token,
  };
}

export function useActiveCooperative() {
  const { token } = useDashboardAuth();
  const { data, loading } = useQuery<{ myCooperatives: CooperativeSummary[] }>(
    MY_COOPERATIVES_QUERY,
    {
      skip: !token,
      fetchPolicy: "cache-and-network",
    },
  );

  const cooperatives = data?.myCooperatives ?? [];
  const storedId = cooperativeStorage.get();

  const activeCooperativeId = useMemo(() => {
    if (storedId && cooperatives.some((coop) => coop.id === storedId)) {
      return storedId;
    }

    return cooperatives[0]?.id;
  }, [cooperatives, storedId]);

  useEffect(() => {
    if (activeCooperativeId && activeCooperativeId !== storedId) {
      cooperativeStorage.set(activeCooperativeId);
    }
  }, [activeCooperativeId, storedId]);

  const activeCooperative = useMemo(
    () => cooperatives.find((coop) => coop.id === activeCooperativeId),
    [activeCooperativeId, cooperatives],
  );

  return {
    cooperatives,
    activeCooperativeId,
    activeCooperative,
    loading,
  };
}
