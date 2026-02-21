import * as CipherForgeGame from "cipherforge_game";
import type { SignTransaction } from "@stellar/stellar-sdk/contract";

import { envClient } from "@/lib/env/client";
import { getStellarNetworkPassphrase } from "@/lib/stellar/network";

type CipherForgeGameClientArgs = {
  publicKey: string;
  signTransaction: SignTransaction;
};

export function createCipherForgeGameClient({
  publicKey,
  signTransaction,
}: CipherForgeGameClientArgs) {
  const testnetConfig = CipherForgeGame.networks.testnet;

  return new CipherForgeGame.Client({
    contractId:
      envClient.NEXT_PUBLIC_CF_GAME_CONTRACT_ID ?? testnetConfig.contractId,
    networkPassphrase: getStellarNetworkPassphrase(),
    rpcUrl: envClient.NEXT_PUBLIC_STELLAR_RPC_URL,
    publicKey,
    signTransaction,
  });
}

export type CipherForgeGameClient = ReturnType<
  typeof createCipherForgeGameClient
>;
