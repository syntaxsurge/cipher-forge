import { extractBaseAddress, StrKey } from "@stellar/stellar-sdk";

const STELLAR_ADDRESS_TOKEN_PATTERN = /[GM][A-Z2-7]{20,80}/gu;

function toBaseAddressIfValid(candidate: string): string | null {
  if (!candidate) {
    return null;
  }

  if (StrKey.isValidEd25519PublicKey(candidate)) {
    return candidate;
  }

  if (StrKey.isValidMed25519PublicKey(candidate)) {
    return extractBaseAddress(candidate);
  }

  try {
    const base = extractBaseAddress(candidate);
    if (StrKey.isValidEd25519PublicKey(base)) {
      return base;
    }
  } catch {
    // Ignore parse errors and continue with additional recovery paths.
  }

  return null;
}

function getAddressCandidates(value: string): string[] {
  const normalized = value.normalize("NFKC").trim().toUpperCase();
  const asciiBase32Only = normalized.replace(/[^A-Z2-7]/gu, "");
  const extractedTokens = normalized.match(STELLAR_ADDRESS_TOKEN_PATTERN) ?? [];

  return [normalized, asciiBase32Only, ...extractedTokens].filter(
    (candidate, index, all) => candidate.length > 0 && all.indexOf(candidate) === index,
  );
}

export function normalizeStellarAddress(value: string | null | undefined): string {
  const raw = value ?? "";
  if (!raw.trim()) {
    return "";
  }

  const candidates = getAddressCandidates(raw);
  for (const candidate of candidates) {
    const normalized = toBaseAddressIfValid(candidate);
    if (normalized) {
      return normalized.trim().toUpperCase();
    }
  }

  return raw.normalize("NFKC").trim().toUpperCase();
}

export function areSameStellarAddress(
  left: string | null | undefined,
  right: string | null | undefined,
) {
  const normalizedLeft = normalizeStellarAddress(left);
  const normalizedRight = normalizeStellarAddress(right);

  if (!normalizedLeft || !normalizedRight) {
    return false;
  }

  return normalizedLeft === normalizedRight;
}
