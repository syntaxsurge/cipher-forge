import { NextResponse } from "next/server";
import { Keypair, StrKey, WebAuth } from "@stellar/stellar-sdk";
import { z } from "zod";

import { signAccessToken, signRefreshToken } from "@/lib/auth/jwt";
import { envServer } from "@/lib/env/server";

export const runtime = "nodejs";

const challengeQuerySchema = z.object({
  account: z.string().min(1),
});

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const account = requestUrl.searchParams.get("account");
  const parsed = challengeQuerySchema.safeParse({ account });

  if (!parsed.success || !StrKey.isValidEd25519PublicKey(parsed.data.account)) {
    return NextResponse.json({ error: "Invalid account address." }, { status: 400 });
  }

  const signingKeypair = Keypair.fromSecret(envServer.CF_SEP10_SIGNING_SEED);

  const transaction = WebAuth.buildChallengeTx(
    signingKeypair,
    parsed.data.account,
    envServer.CF_SEP10_HOME_DOMAIN,
    envServer.CF_SEP10_TIMEOUT_SEC,
    envServer.CF_STELLAR_NETWORK_PASSPHRASE,
    envServer.CF_SEP10_WEB_AUTH_DOMAIN,
  );

  return NextResponse.json(
    {
      transaction,
      network_passphrase: envServer.CF_STELLAR_NETWORK_PASSPHRASE,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

const verifyBodySchema = z.object({
  transaction: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = verifyBodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Missing signed transaction." },
      { status: 400 },
    );
  }

  const signingKeypair = Keypair.fromSecret(envServer.CF_SEP10_SIGNING_SEED);
  const serverPublicKey = signingKeypair.publicKey();

  let clientAccountID: string;

  try {
    const challenge = WebAuth.readChallengeTx(
      parsed.data.transaction,
      serverPublicKey,
      envServer.CF_STELLAR_NETWORK_PASSPHRASE,
      [envServer.CF_SEP10_HOME_DOMAIN],
      envServer.CF_SEP10_WEB_AUTH_DOMAIN,
    );

    WebAuth.verifyChallengeTxSigners(
      parsed.data.transaction,
      serverPublicKey,
      envServer.CF_STELLAR_NETWORK_PASSPHRASE,
      [challenge.clientAccountID],
      [envServer.CF_SEP10_HOME_DOMAIN],
      envServer.CF_SEP10_WEB_AUTH_DOMAIN,
    );

    clientAccountID = challenge.clientAccountID;
  } catch {
    return NextResponse.json(
      { error: "Signed challenge transaction verification failed." },
      { status: 401 },
    );
  }

  const accessToken = await signAccessToken(clientAccountID);
  const refreshToken = await signRefreshToken(clientAccountID);

  const response = NextResponse.json(
    {
      accessToken,
      address: clientAccountID,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );

  response.cookies.set("cf_refresh", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
