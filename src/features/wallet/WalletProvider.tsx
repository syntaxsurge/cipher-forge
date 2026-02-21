"use client";

import {
  FREIGHTER_ID,
  FreighterModule,
} from "@creit.tech/stellar-wallets-kit/modules/freighter.module";
import { StellarWalletsKit } from "@creit.tech/stellar-wallets-kit/stellar-wallets-kit";
import { WalletNetwork } from "@creit.tech/stellar-wallets-kit/types";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { envClient } from "@/lib/env/client";

type WalletContextValue = {
  address: string | null;
  isConnected: boolean;
  kit: StellarWalletsKit | null;
  refreshAddress: (skipRequestAccess?: boolean) => Promise<string | null>;
  signTxXdr: (
    txXdr: string,
    signingAddress?: string,
    networkPassphrase?: string,
  ) => Promise<string>;
  disconnect: () => Promise<void>;
};

const WalletContext = createContext<WalletContextValue | null>(null);

function createKit() {
  return new StellarWalletsKit({
    network: WalletNetwork.TESTNET,
    selectedWalletId: FREIGHTER_ID,
    modules: [new FreighterModule()],
  });
}

let walletKitSingleton: StellarWalletsKit | null = null;

function getWalletKitSingleton() {
  if (!walletKitSingleton) {
    walletKitSingleton = createKit();
  }

  return walletKitSingleton;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const kitRef = useRef<StellarWalletsKit | null>(null);

  if (typeof window !== "undefined" && !kitRef.current) {
    kitRef.current = getWalletKitSingleton();
  }

  const refreshAddress = useCallback(async (skipRequestAccess = true) => {
    const kit = kitRef.current;
    if (!kit) return null;

    try {
      const response = await kit.getAddress({ skipRequestAccess });
      setAddress(response.address);
      return response.address;
    } catch {
      setAddress(null);
      return null;
    }
  }, []);

  useEffect(() => {
    void refreshAddress(true);
  }, [refreshAddress]);

  const value = useMemo<WalletContextValue>(() => {
    return {
      address,
      isConnected: !!address,
      kit: kitRef.current,
      refreshAddress,
      signTxXdr: async (
        txXdr: string,
        signingAddress?: string,
        networkPassphrase?: string,
      ) => {
        const kit = kitRef.current;
        const addressForSignature = signingAddress ?? address;

        if (!kit || !addressForSignature) {
          throw new Error("Wallet is not connected.");
        }

        const { signedTxXdr } = await kit.signTransaction(txXdr, {
          address: addressForSignature,
          networkPassphrase:
            networkPassphrase ?? envClient.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE,
        });

        return signedTxXdr;
      },
      disconnect: async () => {
        const kit = kitRef.current;
        if (!kit) return;
        await kit.disconnect();
        setAddress(null);
      },
    };
  }, [address, refreshAddress]);

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const value = useContext(WalletContext);
  if (!value) {
    throw new Error("useWallet must be used within WalletProvider.");
  }
  return value;
}
