import { envClient } from "@/lib/env/client";

export function getStellarNetworkPassphrase(): string {
  return envClient.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE;
}
