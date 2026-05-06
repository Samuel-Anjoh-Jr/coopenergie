const REQUIRED_SINGLE_ENV_VARS = [
  "NEXT_PUBLIC_API_URL",
  "NEXT_PUBLIC_GRAPHQL_URL",
  "NEXT_PUBLIC_CELOSCAN_BASE",
];

const REQUIRED_ALIAS_ENV_VARS = [["AUTH_SECRET", "NEXTAUTH_SECRET"]];

function isMissing(value) {
  return !value || value.trim().length === 0;
}

function hasAuthUrlSource() {
  const hasExplicitAuthUrl =
    !isMissing(process.env.AUTH_URL) || !isMissing(process.env.NEXTAUTH_URL);
  const hasVercelUrlFallback = !isMissing(process.env.VERCEL_URL);

  return hasExplicitAuthUrl || hasVercelUrlFallback;
}

function validateRequiredEnv() {
  const missing = [];

  for (const key of REQUIRED_SINGLE_ENV_VARS) {
    if (isMissing(process.env[key])) {
      missing.push(key);
    }
  }

  for (const group of REQUIRED_ALIAS_ENV_VARS) {
    const hasAny = group.some((key) => !isMissing(process.env[key]));
    if (!hasAny) {
      missing.push(group.join(" or "));
    }
  }

  if (!hasAuthUrlSource()) {
    missing.push("AUTH_URL or NEXTAUTH_URL or VERCEL_URL");
  }

  if (missing.length === 0) {
    return;
  }

  throw new Error(
    [
      "[env] Missing required environment variables for apps/web.",
      `Set the following in Vercel Project Settings > Environment Variables: ${missing.join(", ")}`,
      "Tip: AUTH_* is preferred, NEXTAUTH_* is supported as fallback, and VERCEL_URL is accepted for preview URL fallback.",
    ].join(" "),
  );
}

const shouldSkipEnvValidation = process.env.SKIP_ENV_VALIDATION === "1";
const isGenericCi = process.env.CI === "true" && isMissing(process.env.VERCEL);

if (!shouldSkipEnvValidation && !isGenericCi) {
  validateRequiredEnv();
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: "../..",
  },
  output: "standalone",
  transpilePackages: ["@coopenergie/types", "@coopenergie/graphql-schema"],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
