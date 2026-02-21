import { createPublicKey } from "node:crypto";

import { exportJWK } from "jose";

const kid = process.env.CF_JWT_KID;
const privateKeyB64 = process.env.CF_JWT_PRIVATE_KEY_B64;

if (!kid || !privateKeyB64) {
  console.error("Missing CF_JWT_KID or CF_JWT_PRIVATE_KEY_B64.");
  process.exit(1);
}

const privatePem = Buffer.from(privateKeyB64, "base64").toString("utf8");
const publicKey = createPublicKey(privatePem);
const jwk = await exportJWK(publicKey);

const jwks = {
  keys: [
    {
      ...jwk,
      kid,
      use: "sig",
      alg: "RS256",
    },
  ],
};

const dataUri =
  "data:text/plain;charset=utf-8;base64," +
  Buffer.from(JSON.stringify(jwks)).toString("base64");

console.log(dataUri);
