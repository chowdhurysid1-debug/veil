/**
 * SHA-256 hashing using Web Crypto.
 * Used for file integrity stamps and per-frame hashes.
 */

/**
 * Compute SHA-256 hex digest of an ArrayBuffer or Blob.
 */
export async function sha256(data: ArrayBuffer | Blob): Promise<string> {
  const buffer = data instanceof Blob ? await data.arrayBuffer() : data;
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Compute SHA-256 of a File (for the original video stamp).
 */
export async function sha256File(file: File): Promise<string> {
  return sha256(await file.arrayBuffer());
}
