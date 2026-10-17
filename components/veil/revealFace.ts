// Turns an unlock response into a viewable image, entirely in the browser:
// fetch the sealed bytes, decrypt with Tab A's decryptFace, hand back a data URL.
// A data URL (not an object URL) needs no revoking: it is gone once the view
// holding it unmounts, which is when the 30 second window ends.
import { decryptFace } from "../../lib/crypto/faceVault";
import type { UnlockResponse } from "../../lib/contracts";
import { VeilApiError } from "./errors";

function bytesToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let index = 0; index < bytes.length; index++) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary);
}

/** MIME type from magic bytes. Real crops are JPEG; the mock vault seals an SVG. */
export function sniffImageType(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer.slice(0, 8));
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e) {
    return "image/png";
  }
  const head = new TextDecoder().decode(bytes).trimStart();
  if (head.startsWith("<svg") || head.startsWith("<?xml")) {
    return "image/svg+xml";
  }
  return "image/jpeg";
}

export async function revealFace(unlock: UnlockResponse): Promise<string> {
  let response: Response;
  try {
    response = await fetch(unlock.ciphertextUrl);
  } catch {
    throw new VeilApiError(
      "We couldn't fetch the sealed face. Check your connection and try again.",
    );
  }
  if (!response.ok) {
    throw new VeilApiError("The vault link expired. Unlock the face again.");
  }

  let plaintext: ArrayBuffer;
  try {
    plaintext = await decryptFace(
      bytesToBase64(await response.arrayBuffer()),
      unlock.rawKeyBase64,
      unlock.ivBase64,
    );
  } catch {
    throw new VeilApiError(
      "This face couldn't be decrypted. The unlock is still in the audit log.",
    );
  }
  return `data:${sniffImageType(plaintext)};base64,${bytesToBase64(plaintext)}`;
}
