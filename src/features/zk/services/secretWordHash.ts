import { blake2s } from "@noble/hashes/blake2.js";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";

export const SECRET_WORD_BYTE_LENGTH = 16;

function normalizeHex(value: string): string {
  return value.trim().replace(/^0x/iu, "").toLowerCase();
}

export function toPaddedSecretWordBytes(secretWord: string): Uint8Array {
  const encoder = new TextEncoder();
  const encoded = encoder.encode(secretWord);

  if (encoded.length === 0) {
    throw new Error("Secret word cannot be empty.");
  }

  if (encoded.length > SECRET_WORD_BYTE_LENGTH) {
    throw new Error(
      `Secret word must be ${SECRET_WORD_BYTE_LENGTH} bytes or fewer in UTF-8.`,
    );
  }

  const padded = new Uint8Array(SECRET_WORD_BYTE_LENGTH);
  padded.set(encoded, 0);
  return padded;
}

export function bytesToNumberArray(bytes: Uint8Array): number[] {
  return Array.from(bytes);
}

export function hashSecretWord(secretWord: string): string {
  const padded = toPaddedSecretWordBytes(secretWord);
  return bytesToHex(blake2s(padded));
}

export function hexHashToBytes(hashHex: string): Uint8Array {
  const normalized = normalizeHex(hashHex);
  if (!/^[a-f0-9]{64}$/u.test(normalized)) {
    throw new Error("Hash must be a 32-byte lowercase hex string.");
  }

  return hexToBytes(normalized);
}

export function prepareSecretWordProofInput(secretWord: string, expectedHashHex: string) {
  const secretWordBytes = toPaddedSecretWordBytes(secretWord);
  const expectedHashBytes = hexHashToBytes(expectedHashHex);

  return {
    secret_word: bytesToNumberArray(secretWordBytes),
    expected_hash: bytesToNumberArray(expectedHashBytes),
  };
}
