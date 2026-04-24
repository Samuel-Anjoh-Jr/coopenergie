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
