import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { ApolloAppProvider } from "@/lib/apollo/provider";
import { AuthSessionProvider } from "@/lib/auth/session-provider";
import { ThemeProvider } from "@/lib/theme-context";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#2563EB",
};

export const metadata: Metadata = {
  title: "CoopEnergie",
  description: "Fund solar energy cooperatively in Cameroon",
  generator: "v0.app",
  applicationName: "CoopEnergie",
  manifest: "/manifest",
  icons: {
    icon: [
      {
        url: "/logo/coopenergie-logo-icon.svg",
        type: "image/svg+xml",
      },
      {
        url: "/favicon-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/favicon-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
    ],
    apple: "/apple-touch-icon.png",
    shortcut: ["/favicon-16x16.png", "/favicon-32x32.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="scroll-smooth" data-scroll-behavior="smooth">
      <body
        className="font-sans antialiased bg-background text-foreground"
        suppressHydrationWarning
      >
        <ApolloAppProvider>
          <ThemeProvider>
            <AuthSessionProvider>
              {children}
              <Toaster />
            </AuthSessionProvider>
          </ThemeProvider>
        </ApolloAppProvider>
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  );
}
