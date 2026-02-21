# CipherForge Soroban Workspace

This workspace contains the on-chain contracts for CipherForge.

## Contracts

- `contracts/cipherforge-game`
  - Manages challenge sessions and settlement state
  - Calls hackathon-required Game Hub methods:
    - `start_game` on session creation
    - `end_game` on settlement
  - Cross-contract verifies proofs via an external UltraHonk verifier contract

## Build

From repo root:

```bash
pnpm soroban:build-contracts
```

## Test

From repo root:

```bash
cd blockchain/soroban
cargo test
```

## Deploy workflow

Use root scripts so verifier and game deployment stay consistent with the app-level docs:

```bash
pnpm soroban:build-artifacts
pnpm soroban:build-contracts
pnpm soroban:deploy-verifier:testnet
STELLAR_VERIFIER_CONTRACT_ID=<id> pnpm soroban:deploy-game:testnet
```
