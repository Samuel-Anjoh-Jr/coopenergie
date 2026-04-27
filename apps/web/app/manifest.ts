import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CoopEnergie",
    short_name: "CoopEnergie",
    description: "Fund solar energy cooperatively in Cameroon",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#F8FAFC",
    theme_color: "#2563EB",
    icons: [
      {
        src: "/logo/coopenergie-logo-icon.svg",
        type: "image/svg+xml",
        sizes: "any",
      },
      {
        src: "/icon-192x192.png",
        type: "image/png",
        sizes: "192x192",
      },
      {
        src: "/icon-512x512.png",
        type: "image/png",
        sizes: "512x512",
      },
      {
        src: "/icon-maskable-512x512.png",
        type: "image/png",
        sizes: "512x512",
        purpose: "maskable",
      },
    ],
  };
}
