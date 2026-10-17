import { createHmac, timingSafeEqual } from "node:crypto";

// What the server vouches for at upload: this clip id had this file hash, captured at this time.
export interface ClipStamp {
  clipId: string;
  sha256: string;
  capturedAt: string;
}

const STAMP_VERSION = "veil-stamp-v1";

// Normalizes the timestamp so a value read back from Postgres signs the same as the original.
export function stampMessage({
  clipId,
  sha256,
  capturedAt,
}: ClipStamp): string {
  return [
    STAMP_VERSION,
    clipId,
    sha256,
    new Date(capturedAt).toISOString(),
  ].join("|");
}

export function signStamp(secret: string, stamp: ClipStamp): string {
  return createHmac("sha256", secret).update(stampMessage(stamp)).digest("hex");
}

export function isStampValid(
  secret: string,
  stamp: ClipStamp,
  signature: string,
): boolean {
  const expected = Buffer.from(signStamp(secret, stamp), "hex");
  const actual = Buffer.from(signature, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
