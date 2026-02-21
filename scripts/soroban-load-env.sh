#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BLOCKCHAIN_ENV_PATH="${STELLAR_BLOCKCHAIN_ENV_PATH:-$ROOT_DIR/blockchain/.env}"

if [[ -f "$BLOCKCHAIN_ENV_PATH" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$BLOCKCHAIN_ENV_PATH"
  set +a
fi
