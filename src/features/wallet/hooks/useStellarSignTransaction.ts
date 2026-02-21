"use client";

import { useMemo } from "react";
import type { SignTransaction } from "@stellar/stellar-sdk/contract";

import { useWallet } from "@/features/wallet/WalletProvider";
import { getStellarNetworkPassphrase } from "@/lib/stellar/network";

export function useStellarSignTransaction(): SignTransaction | null {
  const { address, signTxXdr } = useWallet();

  return useMemo<SignTransaction | null>(() => {
    if (!address) {
      return null;
    }

    return async (txXdr, options) => {
      const signingAddress = options?.address ?? address;
      const networkPassphrase =
        options?.networkPassphrase ?? getStellarNetworkPassphrase();

      const signedTxXdr = await signTxXdr(
        txXdr,
        signingAddress,
        networkPassphrase,
      );

      return {
        signedTxXdr,
        signerAddress: signingAddress,
      };
    };
  }, [address, signTxXdr]);
}
