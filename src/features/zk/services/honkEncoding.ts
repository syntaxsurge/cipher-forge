const MAX_FIELD_VALUE = (1n << 256n) - 1n;

function parsePublicInputField(fieldValue: string): bigint {
  const normalized = fieldValue.trim();

  if (!normalized) {
    throw new Error("Public input field cannot be empty.");
  }

  if (/^0x[0-9a-f]+$/iu.test(normalized)) {
    return BigInt(normalized);
  }

  if (/^[0-9]+$/u.test(normalized)) {
    return BigInt(normalized);
  }

  if (/^[0-9a-f]+$/iu.test(normalized)) {
    return BigInt(`0x${normalized}`);
  }

  throw new Error(`Unsupported public input field format: ${fieldValue}`);
}

export function fieldValueToBytes32(fieldValue: string): Uint8Array {
  const fieldAsBigInt = parsePublicInputField(fieldValue);

  if (fieldAsBigInt < 0n || fieldAsBigInt > MAX_FIELD_VALUE) {
    throw new Error("Public input field is out of 32-byte range.");
  }

  const bytes = new Uint8Array(32);
  let remaining = fieldAsBigInt;

  for (let index = 31; index >= 0; index -= 1) {
    bytes[index] = Number(remaining & 0xffn);
    remaining >>= 8n;
  }

  return bytes;
}

export function flattenPublicInputsToBytes(publicInputs: string[]): Uint8Array {
  const encodedFields = publicInputs.map(fieldValueToBytes32);
  const totalLength = encodedFields.reduce(
    (acc, value) => acc + value.length,
    0,
  );

  const flattened = new Uint8Array(totalLength);
  let offset = 0;

  for (const encodedField of encodedFields) {
    flattened.set(encodedField, offset);
    offset += encodedField.length;
  }

  return flattened;
}
