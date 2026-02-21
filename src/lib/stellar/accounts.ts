import { envClient } from "@/lib/env/client";

type AccountLookupResult = {
  exists: boolean;
  status: number;
};

function getHorizonBaseUrl() {
  return envClient.NEXT_PUBLIC_STELLAR_HORIZON_URL.replace(/\/+$/u, "");
}

export async function checkStellarAccountExists(
  accountId: string,
): Promise<AccountLookupResult> {
  const response = await fetch(`${getHorizonBaseUrl()}/accounts/${accountId}`, {
    method: "GET",
    cache: "no-store",
  });

  if (response.ok) {
    return { exists: true, status: response.status };
  }

  if (response.status === 404) {
    return { exists: false, status: response.status };
  }

  throw new Error(
    `Unable to verify Stellar account (${response.status} ${response.statusText}).`,
  );
}

export function getFriendbotFundingUrl(accountId: string) {
  return `https://friendbot.stellar.org/?addr=${encodeURIComponent(accountId)}`;
}

export async function fundTestnetAccount(accountId: string): Promise<void> {
  const response = await fetch(getFriendbotFundingUrl(accountId), {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Friendbot funding failed (${response.status} ${response.statusText})${body ? `: ${body}` : "."}`,
    );
  }
}
