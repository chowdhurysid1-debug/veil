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

const VIDEO_UPLOAD_VERSION = "veil-video-upload-v1";

// Only the browser that uploaded a clip gets this token, so only it can attach the
// clip's blurred video. Storage refuses a second video, so each token works once.
export function signVideoUpload(secret: string, clipId: string): string {
  return createHmac("sha256", secret)
    .update(`${VIDEO_UPLOAD_VERSION}|${clipId}`)
    .digest("hex");
}

export function isVideoUploadTokenValid(
  secret: string,
  clipId: string,
  token: string,
): boolean {
  const expected = Buffer.from(signVideoUpload(secret, clipId), "hex");
  const actual = Buffer.from(token, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
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
