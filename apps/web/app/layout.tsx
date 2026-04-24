import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { ApolloAppProvider } from "@/lib/apollo/provider";
import { AuthSessionProvider } from "@/lib/auth/session-provider";
import { ThemeProvider } from "@/lib/theme-context";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CoopEnergie",
  description: "Fund solar energy cooperatively in Cameroon",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="scroll-smooth" data-scroll-behavior="smooth">
      <body className="font-sans antialiased bg-background text-foreground" suppressHydrationWarning>
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
