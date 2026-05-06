import { gql } from "@apollo/client";

import { apolloClient } from "@/lib/apollo/client";
import { getCachedClientToken } from "@/lib/auth/client-session";
import { API_URL } from "@/lib/config";
import { restClient } from "@/lib/rest-client";

export type VendorDashboardStats = {
  totalProducts: number;
  totalProposalsReceived: number;
  totalAcceptedProposals: number;
  avgRating: number;
  totalReviews: number;
  accountStatus:
    | "PENDING_PAYMENT"
    | "ACTIVE"
    | "SUSPENDED"
    | "SUBSCRIPTION_EXPIRED";
  subscriptionExpiresAt: string | null;
};

export type VendorSubscriptionRecord = {
  id: string;
  vendorId: string;
  billingCycle: "MONTHLY" | "YEARLY" | string;
  priceXAF: number;
  status: "ACTIVE" | "EXPIRED" | "CANCELLED" | "PENDING" | string;
  campayReference: string | null;
  startedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
};

export type VendorProductImage = {
  id: string;
  url: string;
  sortOrder: number;
};

export type VendorProduct = {
  id: string;
  vendorId: string;
  title: string;
  description: string;
  priceXAF: number;
  unit: string | null;
  inStock: boolean;
  sortOrder: number;
  images: VendorProductImage[];
};

export type VendorReview = {
  id: string;
  reviewerName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
};

export type VendorProfile = {
  id: string;
  businessName: string;
  description: string;
  logoUrl: string | null;
  coverImageUrl: string | null;
  city: string | null;
  country: string;
  email: string | null;
  whatsappNumber: string | null;
  website: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  twitterUrl: string | null;
  linkedinUrl: string | null;
  status: string;
  paymentModel: "ONE_TIME" | "SUBSCRIPTION";
  avgRating: number;
  totalReviews: number;
};

const VENDOR_MONETISATION_SNAPSHOT = gql`
  query VendorMonetisationSnapshot {
    monetisationSettings {
      vendorPaymentModel
      vendorOneTimeFeeXAF
      vendorMonthlyFeeXAF
      vendorYearlyFeeXAF
    }
  }
`;

export async function fetchVendorDashboardStats() {
  return restClient.get<VendorDashboardStats>("/vendors/dashboard/me");
}

export async function fetchVendorProducts(vendorId: string) {
  return restClient.get<VendorProduct[]>(`/vendors/${vendorId}/products`);
}

export async function fetchVendorReviews(vendorId: string) {
  return restClient.get<VendorReview[]>(`/vendors/${vendorId}/reviews`);
}

export async function fetchVendorSubscriptionHistory() {
  return restClient.get<VendorSubscriptionRecord[]>("/vendors/subscriptions");
}

export async function fetchVendorProfile(vendorId: string) {
  return restClient.get<VendorProfile>(`/vendors/${vendorId}`);
}

export async function fetchVendorMonetisationSnapshot() {
  const { data } = await apolloClient.query<{
    monetisationSettings: {
      vendorPaymentModel: "ONE_TIME" | "SUBSCRIPTION";
      vendorOneTimeFeeXAF: number;
      vendorMonthlyFeeXAF: number;
      vendorYearlyFeeXAF: number;
    };
  }>({
    query: VENDOR_MONETISATION_SNAPSHOT,
    fetchPolicy: "network-only",
  });

  return data.monetisationSettings;
}

export async function multipartVendorRequest<T>(
  method: "POST" | "PATCH",
  path: string,
  formData: FormData,
): Promise<T> {
  const token = await getCachedClientToken();

  const response = await fetch(`${API_URL}/api/v1${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  const data = (await response.json().catch(() => ({}))) as {
    message?: string;
    [key: string]: unknown;
  };

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data as T;
}

export function formatXaf(amount: number, locale: "fr" | "en") {
  return new Intl.NumberFormat(locale === "fr" ? "fr-CM" : "en-CM", {
    style: "currency",
    currency: "XAF",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export function formatDate(value: string | null, locale: "fr" | "en") {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(locale === "fr" ? "fr-CM" : "en-CM", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
