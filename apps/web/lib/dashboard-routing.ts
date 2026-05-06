type DashboardUser = {
  role?: string;
  isPlatformAdmin?: boolean;
};

export function getDashboardRouteForUser(
  user: DashboardUser | null | undefined,
  locale: string,
) {
  if (user?.isPlatformAdmin) {
    return `/${locale}/admin`;
  }

  if (user?.role === "VENDOR") {
    return `/${locale}/vendor-dashboard`;
  }

  return `/${locale}/dashboard`;
}
