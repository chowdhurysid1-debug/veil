/** Lowercase hex SHA-256 of a file or buffer, computed with Web Crypto. */
export async function sha256Hex(input: Blob | ArrayBuffer): Promise<string> {
  const buffer = input instanceof Blob ? await input.arrayBuffer() : input;
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
