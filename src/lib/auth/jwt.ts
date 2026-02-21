import { createPublicKey } from "node:crypto";

import { exportJWK, importPKCS8, jwtVerify, SignJWT } from "jose";

import { envServer } from "@/lib/env/server";

const ACCESS_ALGORITHM = "RS256" as const;
const REFRESH_ALGORITHM = "HS256" as const;

let cachedPrivateKey: Awaited<ReturnType<typeof importPKCS8>> | null = null;
let cachedPublicJwk: Record<string, unknown> | null = null;

async function getPrivateKey() {
  if (cachedPrivateKey) {
    return cachedPrivateKey;
  }

  const privatePem = Buffer.from(envServer.CF_JWT_PRIVATE_KEY_B64, "base64").toString(
    "utf8",
  );

  cachedPrivateKey = await importPKCS8(privatePem, ACCESS_ALGORITHM);
  return cachedPrivateKey;
}

export async function getPublicJwk() {
  if (cachedPublicJwk) {
    return cachedPublicJwk;
  }

  const privatePem = Buffer.from(envServer.CF_JWT_PRIVATE_KEY_B64, "base64").toString(
    "utf8",
  );

  const publicKey = createPublicKey(privatePem);
  const jwk = await exportJWK(publicKey);

  cachedPublicJwk = {
    ...jwk,
    kid: envServer.CF_JWT_KID,
    use: "sig",
    alg: ACCESS_ALGORITHM,
  };

  return cachedPublicJwk;
}

export async function signAccessToken(address: string) {
  const privateKey = await getPrivateKey();

  return await new SignJWT({
    address,
  })
    .setProtectedHeader({
      alg: ACCESS_ALGORITHM,
      kid: envServer.CF_JWT_KID,
      typ: "JWT",
    })
    .setSubject(address)
    .setIssuer(envServer.CF_AUTH_ISSUER)
    .setAudience(envServer.CF_AUTH_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(privateKey);
}

const refreshSecret = new TextEncoder().encode(envServer.CF_REFRESH_SECRET);

export async function signRefreshToken(address: string) {
  return await new SignJWT({})
    .setProtectedHeader({
      alg: REFRESH_ALGORITHM,
      typ: "JWT",
    })
    .setSubject(address)
    .setIssuer(envServer.CF_AUTH_ISSUER)
    .setAudience(envServer.CF_AUTH_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(refreshSecret);
}

export async function verifyRefreshToken(token: string) {
  const { payload } = await jwtVerify(token, refreshSecret, {
    issuer: envServer.CF_AUTH_ISSUER,
    audience: envServer.CF_AUTH_AUDIENCE,
  });

  return payload.sub ?? null;
}
