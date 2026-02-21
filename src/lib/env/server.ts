import { z } from "zod";

const serverEnvSchema = z.object({
  CF_AUTH_ISSUER: z.string().min(1),
  CF_AUTH_AUDIENCE: z.string().min(1),
  CF_AUTH_JWKS: z.string().min(1),
  CF_JWT_KID: z.string().min(1),
  CF_JWT_PRIVATE_KEY_B64: z.string().min(1),
  CF_REFRESH_SECRET: z.string().min(32),
  CF_SEP10_SIGNING_SEED: z.string().min(1),
  CF_SEP10_HOME_DOMAIN: z.string().min(1),
  CF_SEP10_WEB_AUTH_DOMAIN: z.string().min(1),
  CF_SEP10_TIMEOUT_SEC: z.coerce.number().int().positive().default(300),
  CF_STELLAR_NETWORK_PASSPHRASE: z.string().min(1),
});

export const envServer = serverEnvSchema.parse({
  CF_AUTH_ISSUER: process.env.CF_AUTH_ISSUER,
  CF_AUTH_AUDIENCE: process.env.CF_AUTH_AUDIENCE,
  CF_AUTH_JWKS: process.env.CF_AUTH_JWKS,
  CF_JWT_KID: process.env.CF_JWT_KID,
  CF_JWT_PRIVATE_KEY_B64: process.env.CF_JWT_PRIVATE_KEY_B64,
  CF_REFRESH_SECRET: process.env.CF_REFRESH_SECRET,
  CF_SEP10_SIGNING_SEED: process.env.CF_SEP10_SIGNING_SEED,
  CF_SEP10_HOME_DOMAIN: process.env.CF_SEP10_HOME_DOMAIN,
  CF_SEP10_WEB_AUTH_DOMAIN: process.env.CF_SEP10_WEB_AUTH_DOMAIN,
  CF_SEP10_TIMEOUT_SEC: process.env.CF_SEP10_TIMEOUT_SEC,
  CF_STELLAR_NETWORK_PASSPHRASE: process.env.CF_STELLAR_NETWORK_PASSPHRASE,
});
