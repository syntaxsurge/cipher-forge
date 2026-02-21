#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const DEFAULT_HUB_CONTRACT_ID =
  "CB4VZAT2U3UC6XFK3N23SKRF2NDCMP3QHJYMCHHFMZO7MRQO6DQ2EMYG";
const DEFAULT_RPC_URL = "https://soroban-testnet.stellar.org";
const BLOCKCHAIN_ENV_PATH = path.join(process.cwd(), "blockchain", ".env");

function preloadBlockchainEnv() {
  if (!existsSync(BLOCKCHAIN_ENV_PATH)) {
    return;
  }

  const raw = readFileSync(BLOCKCHAIN_ENV_PATH, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (!key || process.env[key] !== undefined) {
      continue;
    }

    process.env[key] = value.replace(/^"(.*)"$/u, "$1");
  }
}

function readContractIdFromAlias(alias, network) {
  const output = execFileSync(
    "stellar",
    ["contract", "alias", "show", alias, "--network", network],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  const match = output.match(/C[A-Z2-7]{55}/u);

  if (!match) {
    throw new Error(
      `Could not parse contract id from alias \"${alias}\". CLI output:\n${output}`,
    );
  }

  return match[0];
}

function getConfig() {
  const network = process.env.STELLAR_NETWORK ?? "testnet";

  if (network !== "testnet") {
    throw new Error(
      `export-testnet-config only supports testnet. Received network: ${network}`,
    );
  }

  return {
    network,
    rpcUrl: process.env.NEXT_PUBLIC_STELLAR_RPC_URL ?? DEFAULT_RPC_URL,
    hubContractId:
      process.env.STELLAR_GAME_HUB_CONTRACT_ID ?? DEFAULT_HUB_CONTRACT_ID,
    gameAlias: process.env.STELLAR_GAME_ALIAS ?? "cf_game",
    verifierAlias: process.env.STELLAR_VERIFIER_ALIAS ?? "cf_ultrahonk",
  };
}

function toPublicEnv(payload) {
  return [
    "NEXT_PUBLIC_STELLAR_NETWORK=testnet",
    `NEXT_PUBLIC_STELLAR_RPC_URL=${payload.rpcUrl}`,
    `NEXT_PUBLIC_GAME_HUB_CONTRACT_ID=${payload.hubContractId}`,
    `NEXT_PUBLIC_CF_HUB_CONTRACT_ID=${payload.hubContractId}`,
    `NEXT_PUBLIC_CF_GAME_CONTRACT_ID=${payload.gameContractId}`,
    `NEXT_PUBLIC_CF_ULTRAHONK_VERIFIER_CONTRACT_ID=${payload.verifierContractId}`,
  ].join("\n");
}

function main() {
  preloadBlockchainEnv();
  const config = getConfig();
  const gameContractId = readContractIdFromAlias(
    config.gameAlias,
    config.network,
  );
  const verifierContractId = readContractIdFromAlias(
    config.verifierAlias,
    config.network,
  );

  const payload = {
    network: config.network,
    generatedAt: new Date().toISOString(),
    hubContractId: config.hubContractId,
    gameContractId,
    verifierContractId,
    rpcUrl: config.rpcUrl,
    aliases: {
      game: config.gameAlias,
      verifier: config.verifierAlias,
    },
  };

  const docsDir = path.join(process.cwd(), "docs");
  mkdirSync(docsDir, { recursive: true });

  const contractsJsonPath = path.join(docsDir, "contracts.testnet.json");
  const publicEnvPath = path.join(docsDir, ".env.testnet.public");

  writeFileSync(
    contractsJsonPath,
    `${JSON.stringify(payload, null, 2)}\n`,
    "utf8",
  );
  writeFileSync(publicEnvPath, `${toPublicEnv(payload)}\n`, "utf8");

  console.log("✅ Exported testnet configuration:");
  console.log(`- ${contractsJsonPath}`);
  console.log(`- ${publicEnvPath}`);
  console.log("\nResolved values:");
  console.log(JSON.stringify(payload, null, 2));
}

main();
