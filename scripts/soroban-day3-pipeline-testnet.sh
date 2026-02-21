#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/soroban-load-env.sh"

"$SCRIPT_DIR/soroban-build-circuit-artifacts.sh"
"$SCRIPT_DIR/soroban-build-contracts.sh"

VERIFIER_OUTPUT="$($SCRIPT_DIR/soroban-deploy-verifier-testnet.sh)"
echo "$VERIFIER_OUTPUT"
VERIFIER_CONTRACT_ID="$(printf '%s' "$VERIFIER_OUTPUT" | awk -F= '/^VERIFIER_CONTRACT_ID=/{print $2}' | tr -d '[:space:]')"
if [[ -z "$VERIFIER_CONTRACT_ID" ]]; then
  echo "Failed to capture verifier contract id"
  exit 1
fi
export STELLAR_VERIFIER_CONTRACT_ID="$VERIFIER_CONTRACT_ID"

GAME_OUTPUT="$($SCRIPT_DIR/soroban-deploy-game-testnet.sh)"
echo "$GAME_OUTPUT"
GAME_CONTRACT_ID="$(printf '%s' "$GAME_OUTPUT" | awk -F= '/^GAME_CONTRACT_ID=/{print $2}' | tr -d '[:space:]')"
if [[ -z "$GAME_CONTRACT_ID" ]]; then
  echo "Failed to capture game contract id"
  exit 1
fi
export STELLAR_GAME_CONTRACT_ID="$GAME_CONTRACT_ID"

export STELLAR_SMOKE_MODE="${STELLAR_SMOKE_MODE:-timeout}"
"$SCRIPT_DIR/soroban-smoke-test-testnet.sh"
