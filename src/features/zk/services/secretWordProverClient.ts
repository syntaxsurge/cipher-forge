"use client";

import { type Remote, wrap } from "comlink";

import {
  proveAndVerifySecretWord,
  resetSecretWordProverRuntime,
  warmupSecretWordProverRuntime,
} from "@/features/zk/services/secretWordProverRuntime";
import type { SecretWordProverWorkerApi } from "@/features/zk/types";

const ZK_ASSET_VERSION = "20260222";
const runtimeAssets = [
  `/zk/wasm/acvm_js_bg.wasm?v=${ZK_ASSET_VERSION}`,
  `/zk/wasm/noirc_abi_wasm_bg.wasm?v=${ZK_ASSET_VERSION}`,
  `/zk/secret_word_puzzle.json?v=${ZK_ASSET_VERSION}`,
] as const;

let sharedWorker: Worker | null = null;
let sharedProverWorkerApi: Remote<SecretWordProverWorkerApi> | null = null;
let sharedInThreadApi: SecretWordProverWorkerApi | null = null;

function ensureProverWorker() {
  if (typeof window === "undefined" || typeof Worker === "undefined") {
    throw new Error(
      "Web Worker runtime is unavailable in this environment. Open this page in a browser tab.",
    );
  }

  if (sharedWorker && sharedProverWorkerApi) {
    return {
      api: sharedProverWorkerApi,
    };
  }

  const workerUrl = new URL(
    `../workers/secretWordProver.worker.ts?worker_version=${ZK_ASSET_VERSION}`,
    import.meta.url,
  );
  const worker = new Worker(workerUrl, { type: "module" });
  const proverWorkerApi = wrap<SecretWordProverWorkerApi>(worker);

  sharedWorker = worker;
  sharedProverWorkerApi = proverWorkerApi as Remote<SecretWordProverWorkerApi>;

  return {
    api: sharedProverWorkerApi,
  };
}

function ensureInThreadProver() {
  if (sharedInThreadApi) {
    return sharedInThreadApi;
  }

  sharedInThreadApi = {
    warmup: warmupSecretWordProverRuntime,
    proveAndVerify: proveAndVerifySecretWord,
  };

  return sharedInThreadApi;
}

function ensureProverApi() {
  try {
    return ensureProverWorker().api;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to initialize worker.";
    console.warn(
      "Falling back to main-thread ZK prover because worker initialization failed.",
      message,
    );
    return ensureInThreadProver();
  }
}

export async function checkSecretWordRuntimeAssets() {
  if (typeof window === "undefined") {
    return runtimeAssets.map((assetPath) => ({
      path: assetPath,
      ok: false,
      status: 0,
    }));
  }

  const checks = await Promise.all(
    runtimeAssets.map(async (assetPath) => {
      try {
        const response = await fetch(assetPath, { cache: "no-store" });
        return {
          path: assetPath,
          ok: response.ok,
          status: response.status,
        };
      } catch {
        return {
          path: assetPath,
          ok: false,
          status: 0,
        };
      }
    }),
  );

  return checks;
}

export function getSecretWordRuntimeAssetPaths() {
  return [...runtimeAssets];
}

export function resetSecretWordProverApi() {
  if (sharedWorker) {
    sharedWorker.terminate();
  }
  sharedWorker = null;
  sharedProverWorkerApi = null;
  sharedInThreadApi = null;
  void resetSecretWordProverRuntime();
}

export function getSecretWordProverApi() {
  return ensureProverApi();
}

export function createSecretWordProverApi() {
  const api = ensureProverApi();
  return {
    api,
    dispose() {
      resetSecretWordProverApi();
    },
  };
}
