const REQUIRED_SINGLE_ENV_VARS = [
  "NEXT_PUBLIC_API_URL",
  "NEXT_PUBLIC_GRAPHQL_URL",
  "NEXT_PUBLIC_CELOSCAN_BASE",
];

const REQUIRED_ALIAS_ENV_VARS = [
  ["AUTH_SECRET", "NEXTAUTH_SECRET"],
  ["AUTH_URL", "NEXTAUTH_URL"],
];

function isMissing(value) {
  return !value || value.trim().length === 0;
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

  if (missing.length === 0) {
    return;
  }

  throw new Error(
    [
      "[env] Missing required environment variables for apps/web.",
      `Set the following in Vercel Project Settings > Environment Variables: ${missing.join(", ")}`,
      "Tip: AUTH_* is preferred, NEXTAUTH_* is supported as fallback.",
    ].join(" "),
  );
}

validateRequiredEnv();

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
