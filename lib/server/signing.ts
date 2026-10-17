import { createHmac, timingSafeEqual } from "node:crypto";

// What the server vouches for: at stampedAt (server clock), this clip id was registered
// with this file hash and this client-reported capture time. The browser computes the
// hash because the original video never leaves it; the stamp pins that claim in time.
export interface ClipStamp {
  clipId: string;
  sha256: string;
  capturedAt: string;
  stampedAt: string;
}

const STAMP_VERSION = "veil-stamp-v1";

// Normalizes timestamps so values read back from Postgres sign the same as the originals.
export function stampMessage({
  clipId,
  sha256,
  capturedAt,
  stampedAt,
}: ClipStamp): string {
  return [
    STAMP_VERSION,
    clipId,
    sha256,
    new Date(capturedAt).toISOString(),
    new Date(stampedAt).toISOString(),
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
