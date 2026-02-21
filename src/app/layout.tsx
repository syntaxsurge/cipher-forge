import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/app/Providers";
import { AppFooter } from "@/components/layout/AppFooter";
import { AppHeader } from "@/components/layout/AppHeader";
import "@/styles/globals.css";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space" });

export const metadata: Metadata = {
  title: "CipherForge",
  description: "ZK puzzle challenge creation and matching on Stellar",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${spaceGrotesk.variable} font-sans antialiased`}>
        <Providers>
          <div className="min-h-screen">
            <AppHeader />
            <div>{children}</div>
            <AppFooter />
          </div>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
