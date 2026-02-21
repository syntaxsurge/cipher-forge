#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
source "$SCRIPT_DIR/soroban-load-env.sh"
VERIFIER_REPO="$ROOT_DIR/vendor/rs-soroban-ultrahonk"
GAME_WORKSPACE="$ROOT_DIR/blockchain/soroban"

if ! rustup target list --installed | grep -q '^wasm32v1-none$'; then
  rustup target add wasm32v1-none
fi

if [[ ! -d "$VERIFIER_REPO" ]]; then
  echo "Missing verifier repo at $VERIFIER_REPO"
  exit 1
fi

if [[ ! -d "$GAME_WORKSPACE" ]]; then
  echo "Missing game workspace at $GAME_WORKSPACE"
  exit 1
fi

pushd "$VERIFIER_REPO" >/dev/null
stellar contract build --profile release
popd >/dev/null

pushd "$GAME_WORKSPACE" >/dev/null
stellar contract build --profile release
popd >/dev/null

echo "Built verifier and game contract WASM binaries"
