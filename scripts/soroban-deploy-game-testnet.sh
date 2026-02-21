#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
source "$SCRIPT_DIR/soroban-load-env.sh"

NETWORK="${STELLAR_NETWORK:-testnet}"
SOURCE_ACCOUNT="${STELLAR_SOURCE_ACCOUNT:-alice}"
GAME_ALIAS="${STELLAR_GAME_ALIAS:-cf_game}"
GAME_HUB_CONTRACT_ID="${STELLAR_GAME_HUB_CONTRACT_ID:-CB4VZAT2U3UC6XFK3N23SKRF2NDCMP3QHJYMCHHFMZO7MRQO6DQ2EMYG}"
GAME_WASM_PATH="${STELLAR_GAME_WASM_PATH:-$ROOT_DIR/blockchain/soroban/target/wasm32v1-none/release/cipherforge_game.wasm}"
VERIFIER_CONTRACT_ID="${STELLAR_VERIFIER_CONTRACT_ID:-}"

if [[ -z "$VERIFIER_CONTRACT_ID" ]]; then
  echo "STELLAR_VERIFIER_CONTRACT_ID is required"
  exit 1
fi

if [[ ! -f "$GAME_WASM_PATH" ]]; then
  echo "Game WASM not found: $GAME_WASM_PATH"
  echo "Run: pnpm soroban:build-contracts"
  exit 1
fi

ADMIN_ADDRESS="${STELLAR_ADMIN_ADDRESS:-$(stellar keys address "$SOURCE_ACCOUNT")}"
ADMIN_ADDRESS="${ADMIN_ADDRESS//[[:space:]]/}"

GAME_CONTRACT_ID="$({
  stellar contract deploy \
    --wasm "$GAME_WASM_PATH" \
    --source-account "$SOURCE_ACCOUNT" \
    --network "$NETWORK" \
    --alias "$GAME_ALIAS" \
    -- \
    --admin "$ADMIN_ADDRESS" \
    --hub_contract "$GAME_HUB_CONTRACT_ID" \
    --verifier_contract "$VERIFIER_CONTRACT_ID"
} | tr -d '\n' | tr -d '[:space:]')"

echo "GAME_CONTRACT_ID=$GAME_CONTRACT_ID"
