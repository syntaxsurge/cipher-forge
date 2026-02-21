# CipherForge Demo Script (2-3 Minutes)

## Goal

Demonstrate that CipherForge uses zero-knowledge as gameplay and verifies outcomes on Stellar Testnet.

## 0:00-0:20 Intro

- CipherForge is a creator marketplace for secret-word puzzle drops.
- Solvers prove they know the answer without revealing the answer.
- Proof validity is settled on-chain.

## 0:20-1:00 Creator Flow (`/forge`)

1. Connect a Stellar Testnet wallet.
2. Sign in with SEP-10.
3. Create a Secret Word challenge draft.
4. Open the generated proof workbench link.

## 1:00-2:10 Solver + On-chain Flow (`/forge/[challengeId]/prove`)

1. Connect a second wallet.
2. Enter the secret word and generate a proof in-browser.
3. Start a game session on-chain (`create_session`).
4. Submit proof/public input bytes on-chain (`submit_proof`).
5. Show final success status in the UI.

## 2:10-2:45 Independent Verification (`/judge` + Stellar Lab)

1. Open `/judge` and copy game/verifier IDs.
2. Open Stellar Lab Contract Explorer on Testnet.
3. Inspect the game contract and confirm the configured IDs.
4. Explain that session lifecycle uses the required Game Hub contract calls.

## Closing (15s)

- ZK is the core mechanic, not a side demo.
- Gameplay loop is end-to-end: creator challenge -> solver proof -> on-chain verification.
- Contract IDs and commands are reproducible from the repository docs.
