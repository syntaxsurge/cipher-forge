"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useWallet } from "@/features/wallet/WalletProvider";
import { areSameStellarAddress } from "@/lib/stellar/address";

type CipherForgeAuthContextValue = {
  isLoading: boolean;
  isAuthenticated: boolean;
  address: string | null;
  accessToken: string | null;
  signInWithSep10: () => Promise<void>;
  signOut: () => Promise<void>;
  fetchAccessToken: (args: { forceRefreshToken: boolean }) => Promise<string | null>;
};

const CipherForgeAuthContext = createContext<CipherForgeAuthContextValue | null>(null);

export function CipherForgeAuthProvider({ children }: { children: ReactNode }) {
  const wallet = useWallet();
  const [isLoading, setIsLoading] = useState(true);
  const [address, setAddress] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const hydrateFromRefreshCookie = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/stellar/token", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      if (!response.ok) {
        setAccessToken(null);
        setAddress(null);
        return;
      }

      const payload = (await response.json()) as {
        authenticated: boolean;
        address?: string;
        accessToken?: string;
      };

      if (!payload.authenticated || !payload.address || !payload.accessToken) {
        setAccessToken(null);
        setAddress(null);
        return;
      }

      setAccessToken(payload.accessToken);
      setAddress(payload.address);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void hydrateFromRefreshCookie();
  }, [hydrateFromRefreshCookie]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    if (!wallet.address || !areSameStellarAddress(wallet.address, address)) {
      void fetch("/api/auth/stellar/logout", {
        method: "POST",
        credentials: "include",
      }).catch(() => null);
      setAccessToken(null);
      setAddress(null);
    }
  }, [accessToken, address, wallet.address]);

  const signInWithSep10 = useCallback(async () => {
    const signerAddress = wallet.address ?? (await wallet.refreshAddress(false));

    if (!signerAddress) {
      throw new Error("Wallet connection is required before signing in.");
    }

    const challengeResponse = await fetch(
      `/api/auth/stellar?account=${encodeURIComponent(signerAddress)}`,
      {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      },
    );

    if (!challengeResponse.ok) {
      throw new Error("Failed to generate SEP-10 challenge transaction.");
    }

    const challengePayload = (await challengeResponse.json()) as {
      transaction: string;
      network_passphrase: string;
    };

    const signedTransaction = await wallet.signTxXdr(
      challengePayload.transaction,
      signerAddress,
      challengePayload.network_passphrase,
    );

    const verifyResponse = await fetch("/api/auth/stellar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ transaction: signedTransaction }),
      credentials: "include",
    });

    if (!verifyResponse.ok) {
      throw new Error("SEP-10 verification failed.");
    }

    const verifiedPayload = (await verifyResponse.json()) as {
      accessToken: string;
      address: string;
    };

    setAccessToken(verifiedPayload.accessToken);
    setAddress(verifiedPayload.address);
  }, [wallet]);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/stellar/logout", {
      method: "POST",
      credentials: "include",
    }).catch(() => null);

    setAccessToken(null);
    setAddress(null);
  }, []);

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      if (!forceRefreshToken && accessToken) {
        return accessToken;
      }

      const response = await fetch("/api/auth/stellar/token", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      if (!response.ok) {
        setAccessToken(null);
        setAddress(null);
        return null;
      }

      const payload = (await response.json()) as {
        authenticated: boolean;
        address?: string;
        accessToken?: string;
      };

      if (!payload.authenticated || !payload.address || !payload.accessToken) {
        setAccessToken(null);
        setAddress(null);
        return null;
      }

      setAccessToken(payload.accessToken);
      setAddress(payload.address);
      return payload.accessToken;
    },
    [accessToken],
  );

  const value = useMemo<CipherForgeAuthContextValue>(() => {
    return {
      isLoading,
      isAuthenticated: !!accessToken,
      address,
      accessToken,
      signInWithSep10,
      signOut,
      fetchAccessToken,
    };
  }, [accessToken, address, fetchAccessToken, isLoading, signInWithSep10, signOut]);

  return (
    <CipherForgeAuthContext.Provider value={value}>
      {children}
    </CipherForgeAuthContext.Provider>
  );
}

export function useCipherForgeAuth() {
  const value = useContext(CipherForgeAuthContext);
  if (!value) {
    throw new Error(
      "useCipherForgeAuth must be used within CipherForgeAuthProvider.",
    );
  }
  return value;
}

export function useConvexAuthBridge() {
  const auth = useCipherForgeAuth();

  return useMemo(
    () => ({
      isLoading: auth.isLoading,
      isAuthenticated: auth.isAuthenticated,
      fetchAccessToken: auth.fetchAccessToken,
    }),
    [auth.fetchAccessToken, auth.isAuthenticated, auth.isLoading],
  );
}
