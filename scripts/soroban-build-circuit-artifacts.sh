#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
source "$SCRIPT_DIR/soroban-load-env.sh"
VERIFIER_REPO="$ROOT_DIR/vendor/rs-soroban-ultrahonk"

if [[ ! -d "$VERIFIER_REPO" ]]; then
  echo "Missing verifier repo at $VERIFIER_REPO"
  echo "Run: git clone https://github.com/yugocabrio/rs-soroban-ultrahonk vendor/rs-soroban-ultrahonk"
  exit 1
fi

pushd "$VERIFIER_REPO" >/dev/null
bash tests/build_circuits.sh
popd >/dev/null

echo "Built verifier artifacts in vendor/rs-soroban-ultrahonk/tests/*/target"
