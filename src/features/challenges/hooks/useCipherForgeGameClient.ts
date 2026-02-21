"use client";

import { useMemo } from "react";

import { createCipherForgeGameClient } from "@/lib/stellar/contracts/cipherforgeGameClient";
import { useWallet } from "@/features/wallet/WalletProvider";
import { useStellarSignTransaction } from "@/features/wallet/hooks/useStellarSignTransaction";

export function useCipherForgeGameClient() {
  const { address } = useWallet();
  const signTransaction = useStellarSignTransaction();

  return useMemo(() => {
    if (!address || !signTransaction) {
      return null;
    }

    return createCipherForgeGameClient({
      publicKey: address,
      signTransaction,
    });
  }, [address, signTransaction]);
}
