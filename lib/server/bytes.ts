import { createHash } from "node:crypto";

const BASE64_PATTERN = /^[A-Za-z0-9+/]*={0,2}$/;

// Buffer.from silently skips bad characters, so check the alphabet and padding first.
export function decodeBase64(value: string): Uint8Array | null {
  if (value.length === 0 || value.length % 4 !== 0) return null;
  if (!BASE64_PATTERN.test(value)) return null;
  return new Uint8Array(Buffer.from(value, "base64"));
}

export function isJpeg(bytes: Uint8Array): boolean {
  return (
    bytes.length > 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  );
}

export function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
