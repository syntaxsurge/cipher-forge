import { UltraHonkBackend } from "@aztec/bb.js";
import initACVM from "@noir-lang/acvm_js";
import { Noir, type CompiledCircuit, type InputMap } from "@noir-lang/noir_js";
import initNoirC from "@noir-lang/noirc_abi";

import { flattenPublicInputsToBytes } from "@/features/zk/services/honkEncoding";
import type {
  SecretWordProofInput,
  SecretWordProofResult,
} from "@/features/zk/types";

type Runtime = {
  noir: Noir;
  backend: UltraHonkBackend;
};

type CompiledCircuitWithVersion = CompiledCircuit & {
  noir_version?: string;
};

const SUPPORTED_NOIR_VERSION_PREFIX = "1.0.0-beta.18";
const ZK_ASSET_VERSION = "20260222";
const ZK_ASSET_PATHS = {
  acvmWasm: `/zk/wasm/acvm_js_bg.wasm?v=${ZK_ASSET_VERSION}`,
  noircAbiWasm: `/zk/wasm/noirc_abi_wasm_bg.wasm?v=${ZK_ASSET_VERSION}`,
  circuit: `/zk/secret_word_puzzle.json?v=${ZK_ASSET_VERSION}`,
};

let runtimePromise: Promise<Runtime> | null = null;
let runtimeInstance: Runtime | null = null;

function formatRuntimeError(error: unknown): Error {
  const rawMessage =
    error instanceof Error ? error.message : "Failed to initialize ZK runtime.";
  const message = rawMessage.toLowerCase();

  if (
    message.includes("deserialize circuit") ||
    message.includes("failed to deserialize circuit")
  ) {
    return new Error(
      "ZK runtime version mismatch detected. Rebuild and sync Noir assets (pnpm zk:build) so compiler and browser runtime use the same version.",
    );
  }

  if (message.includes("failed to load /zk/")) {
    return new Error(
      "ZK runtime assets are missing. Run pnpm zk:build and reload the page.",
    );
  }

  return error instanceof Error ? error : new Error(rawMessage);
}

function formatProofExecutionError(error: unknown): Error {
  const rawMessage =
    error instanceof Error ? error.message : "Proof generation failed.";
  const message = rawMessage.toLowerCase();

  if (
    message.includes("assertion failed") ||
    message.includes("unsatisfied") ||
    message.includes("constraint") ||
    message.includes("witness")
  ) {
    return new Error(
      "Incorrect victory code for this challenge. Check the hint and required format, then try again.",
    );
  }

  return error instanceof Error ? error : new Error(rawMessage);
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = "";

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

async function fetchOrThrow(path: string): Promise<Response> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(
      `Failed to load ${path}: ${response.status} ${response.statusText}`,
    );
  }
  return response;
}

async function getRuntime(): Promise<Runtime> {
  if (runtimePromise) {
    return runtimePromise;
  }

  runtimePromise = (async () => {
    try {
      const [acvmWasmResponse, noircWasmResponse, circuitResponse] =
        await Promise.all([
          fetchOrThrow(ZK_ASSET_PATHS.acvmWasm),
          fetchOrThrow(ZK_ASSET_PATHS.noircAbiWasm),
          fetchOrThrow(ZK_ASSET_PATHS.circuit),
        ]);

      await Promise.all([
        initACVM(acvmWasmResponse),
        initNoirC(noircWasmResponse),
      ]);

      const compiledCircuit =
        (await circuitResponse.json()) as CompiledCircuitWithVersion;
      if (
        typeof compiledCircuit.noir_version !== "string" ||
        !compiledCircuit.noir_version.startsWith(SUPPORTED_NOIR_VERSION_PREFIX)
      ) {
        throw new Error(
          `Circuit noir_version (${compiledCircuit.noir_version ?? "unknown"}) is incompatible with runtime (${SUPPORTED_NOIR_VERSION_PREFIX}).`,
        );
      }

      const noir = new Noir(compiledCircuit);
      await noir.init();

      const backend = new UltraHonkBackend(compiledCircuit.bytecode, {
        threads: 1,
      });

      const runtime = { noir, backend };
      runtimeInstance = runtime;
      return runtime;
    } catch (error) {
      runtimePromise = null;
      runtimeInstance = null;
      throw formatRuntimeError(error);
    }
  })();

  return runtimePromise;
}

export async function warmupSecretWordProverRuntime(): Promise<void> {
  await getRuntime();
}

export async function proveAndVerifySecretWord(
  input: SecretWordProofInput,
): Promise<SecretWordProofResult> {
  if (input.secret_word.length !== 16) {
    throw new Error("secret_word must be a 16-byte array.");
  }

  if (input.expected_hash.length !== 32) {
    throw new Error("expected_hash must be a 32-byte array.");
  }

  const { noir, backend } = await getRuntime();

  let witnessResult: Awaited<ReturnType<typeof noir.execute>>;
  try {
    witnessResult = await noir.execute(input as unknown as InputMap);
  } catch (error) {
    throw formatProofExecutionError(error);
  }

  const proofData = await backend.generateProof(witnessResult.witness, {
    keccak: true,
  });
  const isValid = await backend.verifyProof(proofData, { keccak: true });
  if (!isValid) {
    throw new Error(
      "Local verifier rejected generated proof. This usually indicates a proving-runtime mismatch.",
    );
  }

  const verificationKey = await backend.getVerificationKey({ keccak: true });
  const publicInputsBytes = flattenPublicInputsToBytes(proofData.publicInputs);
  const proofBase64 = uint8ArrayToBase64(proofData.proof);

  return {
    proofBase64,
    proofBytesBase64: proofBase64,
    verificationKeyBase64: uint8ArrayToBase64(verificationKey),
    publicInputs: proofData.publicInputs,
    publicInputsBytesBase64: uint8ArrayToBase64(publicInputsBytes),
    isValid,
  };
}

export async function resetSecretWordProverRuntime(): Promise<void> {
  if (runtimeInstance) {
    try {
      await runtimeInstance.backend.destroy();
    } catch {
      // Ignore runtime destroy errors; reset happens best-effort.
    }
  }

  runtimeInstance = null;
  runtimePromise = null;
}
