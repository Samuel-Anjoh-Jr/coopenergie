import { api } from "@/lib/api";

export type VendorDashboardStats = {
  totalProducts: number;
  totalProposalsReceived: number;
  totalAcceptedProposals: number;
  avgRating: number;
  totalReviews: number;
  accountStatus: string;
  subscriptionExpiresAt: string | null;
};

export type VendorProductImage = {
  id: string;
  url: string;
};

export type VendorProduct = {
  id: string;
  title: string;
  description: string;
  priceXAF: number;
  unit: string | null;
  inStock: boolean;
  sortOrder: number;
  images: VendorProductImage[];
};

export type VendorSubscriptionRecord = {
  id: string;
  billingCycle: string;
  priceXAF: number;
  status: string;
  createdAt: string;
  expiresAt: string | null;
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
};

export type VendorReview = {
  id: string;
  reviewerName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
};

export function formatXaf(value: number) {
  return new Intl.NumberFormat("fr-CM", {
    style: "currency",
    currency: "XAF",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export async function getDashboardStats() {
  return api.get<VendorDashboardStats>("/vendors/dashboard/me");
}

export async function getVendorProducts(vendorId: string) {
  return api.get<VendorProduct[]>(`/vendors/${vendorId}/products`);
}

export async function getVendorReviews(vendorId: string) {
  return api.get<VendorReview[]>(`/vendors/${vendorId}/reviews`);
}

export async function getVendorProfile(vendorId: string) {
  return api.get<VendorProfile>(`/vendors/${vendorId}`);
}

export async function getSubscriptionHistory() {
  return api.get<VendorSubscriptionRecord[]>("/vendors/subscriptions");
}
