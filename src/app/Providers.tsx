"use client";

import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { type ReactNode, useMemo } from "react";

import {
  CipherForgeAuthProvider,
  useConvexAuthBridge,
} from "@/features/auth/CipherForgeAuthProvider";
import { WalletProvider } from "@/features/wallet/WalletProvider";
import { envClient } from "@/lib/env/client";
import { ThemeProvider } from "@/components/layout/ThemeProvider";

function ConvexAuthedProvider({ children }: { children: ReactNode }) {
  const convexClient = useMemo(
    () => new ConvexReactClient(envClient.NEXT_PUBLIC_CONVEX_URL),
    [],
  );

  return (
    <ConvexProviderWithAuth client={convexClient} useAuth={useConvexAuthBridge}>
      {children}
    </ConvexProviderWithAuth>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <WalletProvider>
        <CipherForgeAuthProvider>
          <ConvexAuthedProvider>{children}</ConvexAuthedProvider>
        </CipherForgeAuthProvider>
      </WalletProvider>
    </ThemeProvider>
  );
}
