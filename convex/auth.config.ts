import type { AuthConfig } from "convex/server";

const issuer = process.env.CF_AUTH_ISSUER;
const applicationID = process.env.CF_AUTH_AUDIENCE;
const jwks = process.env.CF_AUTH_JWKS;

if (!issuer || !applicationID || !jwks) {
  throw new Error(
    "Missing CF_AUTH_ISSUER, CF_AUTH_AUDIENCE, or CF_AUTH_JWKS for Convex auth config.",
  );
}

const authConfig: AuthConfig = {
  providers: [
    {
      type: "customJwt",
      issuer,
      applicationID,
      jwks,
      algorithm: "RS256",
    },
  ],
};

export default authConfig;
