#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
source "$SCRIPT_DIR/soroban-load-env.sh"

NETWORK="${STELLAR_NETWORK:-testnet}"
GAME_CONTRACT_ID="${STELLAR_GAME_CONTRACT_ID:-${NEXT_PUBLIC_CF_GAME_CONTRACT_ID:-}}"
GAME_ALIAS="${STELLAR_GAME_ALIAS:-cf_game}"
OUTPUT_DIR="${STELLAR_BINDINGS_OUTPUT_DIR:-$ROOT_DIR/packages/cipherforge_game}"

if [[ -z "$GAME_CONTRACT_ID" ]]; then
  if GAME_ALIAS_OUTPUT="$(stellar contract alias show "$GAME_ALIAS" --network "$NETWORK" 2>/dev/null)"; then
    if GAME_CONTRACT_ID_FROM_ALIAS="$(printf '%s' "$GAME_ALIAS_OUTPUT" | grep -Eo 'C[A-Z2-7]{55}' | head -n 1)"; then
      GAME_CONTRACT_ID="$GAME_CONTRACT_ID_FROM_ALIAS"
    fi
  fi
fi

if [[ -z "$GAME_CONTRACT_ID" ]]; then
  echo "STELLAR_GAME_CONTRACT_ID (or NEXT_PUBLIC_CF_GAME_CONTRACT_ID) is required."
  echo "No alias resolution result for STELLAR_GAME_ALIAS=$GAME_ALIAS on network=$NETWORK."
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

stellar contract bindings typescript \
  --network "$NETWORK" \
  --id "$GAME_CONTRACT_ID" \
  --output-dir "$OUTPUT_DIR" \
  --overwrite

pnpm --dir "$OUTPUT_DIR" install
pnpm --dir "$OUTPUT_DIR" run build

pnpm add "file:./packages/cipherforge_game"

echo "Generated and linked TypeScript bindings for contract: $GAME_CONTRACT_ID"
