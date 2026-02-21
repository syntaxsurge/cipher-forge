import { Buffer } from "buffer";

export function bytesToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

export function base64ToBytes(base64Value: string): Uint8Array {
  return Uint8Array.from(Buffer.from(base64Value, "base64"));
}

export function base64ToBuffer(base64Value: string): Buffer {
  return Buffer.from(base64Value, "base64");
}
