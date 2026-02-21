#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
source "$SCRIPT_DIR/soroban-load-env.sh"

NETWORK="${STELLAR_NETWORK:-testnet}"
SOURCE_ACCOUNT="${STELLAR_SOURCE_ACCOUNT:-alice}"
VERIFIER_ALIAS="${STELLAR_VERIFIER_ALIAS:-cf_ultrahonk}"
VERIFIER_WASM_PATH="${STELLAR_VERIFIER_WASM_PATH:-$ROOT_DIR/vendor/rs-soroban-ultrahonk/target/wasm32v1-none/release/rs_soroban_ultrahonk.wasm}"
VK_BYTES_PATH="${STELLAR_VK_BYTES_PATH:-$ROOT_DIR/vendor/rs-soroban-ultrahonk/tests/simple_circuit/target/vk}"

if [[ ! -f "$VERIFIER_WASM_PATH" ]]; then
  echo "Verifier WASM not found: $VERIFIER_WASM_PATH"
  echo "Run: pnpm soroban:build-contracts"
  exit 1
fi

if [[ ! -f "$VK_BYTES_PATH" ]]; then
  echo "Verifier key bytes not found: $VK_BYTES_PATH"
  echo "Run: pnpm soroban:build-artifacts"
  exit 1
fi

VERIFIER_CONTRACT_ID="$({
  stellar contract deploy \
    --wasm "$VERIFIER_WASM_PATH" \
    --source-account "$SOURCE_ACCOUNT" \
    --network "$NETWORK" \
    --alias "$VERIFIER_ALIAS" \
    -- \
    --vk_bytes-file-path "$VK_BYTES_PATH"
} | tr -d '\n' | tr -d '[:space:]')"

echo "VERIFIER_CONTRACT_ID=$VERIFIER_CONTRACT_ID"
