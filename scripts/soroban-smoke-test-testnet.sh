#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
source "$SCRIPT_DIR/soroban-load-env.sh"

NETWORK="${STELLAR_NETWORK:-testnet}"
GAME_CONTRACT_ID="${STELLAR_GAME_CONTRACT_ID:-}"
PLAYER1_SOURCE_ACCOUNT="${STELLAR_SOURCE_ACCOUNT:-alice}"
PLAYER2_SOURCE_ACCOUNT="${STELLAR_PLAYER2_SOURCE_ACCOUNT:-bob}"
SMOKE_MODE="${STELLAR_SMOKE_MODE:-proof}"
PUBLIC_INPUTS_PATH="${STELLAR_PUBLIC_INPUTS_PATH:-$ROOT_DIR/vendor/rs-soroban-ultrahonk/tests/simple_circuit/target/public_inputs}"
PROOF_BYTES_PATH="${STELLAR_PROOF_BYTES_PATH:-$ROOT_DIR/vendor/rs-soroban-ultrahonk/tests/simple_circuit/target/proof}"

if [[ -z "$GAME_CONTRACT_ID" ]]; then
  echo "STELLAR_GAME_CONTRACT_ID is required"
  exit 1
fi

if [[ "$SMOKE_MODE" == "proof" ]]; then
  if [[ ! -f "$PUBLIC_INPUTS_PATH" ]]; then
    echo "Public inputs file not found: $PUBLIC_INPUTS_PATH"
    exit 1
  fi

  if [[ ! -f "$PROOF_BYTES_PATH" ]]; then
    echo "Proof bytes file not found: $PROOF_BYTES_PATH"
    exit 1
  fi
fi

PLAYER1_ADDRESS="$(stellar keys address "$PLAYER1_SOURCE_ACCOUNT" | tr -d '[:space:]')"
PLAYER2_ADDRESS="$(stellar keys address "$PLAYER2_SOURCE_ACCOUNT" | tr -d '[:space:]')"

SESSION_ID_RAW="$({
  stellar contract invoke \
    --id "$GAME_CONTRACT_ID" \
    --source-account "$PLAYER2_SOURCE_ACCOUNT" \
    --network "$NETWORK" \
    -- \
    create_session \
    --player1 "$PLAYER1_ADDRESS" \
    --player2 "$PLAYER2_ADDRESS"
} | tr -d '\n')"

SESSION_ID="$(printf '%s' "$SESSION_ID_RAW" | sed -E 's/[^0-9]*([0-9]+).*/\1/')"
if [[ -z "$SESSION_ID" ]]; then
  echo "Unable to parse session id from output: $SESSION_ID_RAW"
  exit 1
fi

echo "SESSION_ID=$SESSION_ID"

case "$SMOKE_MODE" in
  proof)
    if ! stellar contract invoke \
      --id "$GAME_CONTRACT_ID" \
      --source-account "$PLAYER2_SOURCE_ACCOUNT" \
      --network "$NETWORK" \
      -- \
      submit_proof \
      --session_id "$SESSION_ID" \
      --public_inputs-file-path "$PUBLIC_INPUTS_PATH" \
      --proof_bytes-file-path "$PROOF_BYTES_PATH" >/dev/null; then
      echo "Proof-mode settlement failed. If testnet exceeds CPU budget, rerun with STELLAR_SMOKE_MODE=timeout."
      exit 1
    fi
    ;;
  timeout)
    stellar contract invoke \
      --id "$GAME_CONTRACT_ID" \
      --source-account "$PLAYER1_SOURCE_ACCOUNT" \
      --network "$NETWORK" \
      -- \
      resolve_timeout \
      --session_id "$SESSION_ID" \
      --player1_won true >/dev/null
    ;;
  *)
    echo "Unsupported STELLAR_SMOKE_MODE=$SMOKE_MODE. Use 'proof' or 'timeout'."
    exit 1
    ;;
esac

SESSION_STATE="$({
  stellar contract invoke \
    --id "$GAME_CONTRACT_ID" \
    --source-account "$PLAYER1_SOURCE_ACCOUNT" \
    --network "$NETWORK" \
    -- \
    get_session \
    --session_id "$SESSION_ID"
} | tr -d '\n')"

echo "SESSION_STATE=$SESSION_STATE"
