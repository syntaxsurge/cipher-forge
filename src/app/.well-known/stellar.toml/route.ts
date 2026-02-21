import { Keypair } from "@stellar/stellar-sdk";

import { envServer } from "@/lib/env/server";

export const runtime = "nodejs";

export async function GET() {
  const signingPublicKey = Keypair.fromSecret(envServer.CF_SEP10_SIGNING_SEED).publicKey();
  const issuer = envServer.CF_AUTH_ISSUER.replace(/\/$/, "");
  const body = [
    `NETWORK_PASSPHRASE=\"${envServer.CF_STELLAR_NETWORK_PASSPHRASE}\"`,
    `SIGNING_KEY=\"${signingPublicKey}\"`,
    `WEB_AUTH_ENDPOINT=\"${issuer}/api/auth/stellar\"`,
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
