/**
 * Face vault crypto: AES-GCM 256 encryption for face crops.
 * Each face gets a fresh key. Keys are exported raw for server-side wrapping.
 * All operations use Web Crypto and run in the browser.
 */

export interface EncryptedFace {
  ciphertextBase64: string;
  ivBase64: string;
  rawKeyBase64: string;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Encrypt a face crop blob with AES-GCM 256 using a fresh random key.
 */
export async function encryptFace(faceBlob: Blob): Promise<EncryptedFace> {
  const plaintext = await faceBlob.arrayBuffer();

  // Generate a fresh AES-GCM 256-bit key
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true, // extractable, so we can export the raw key
    ["encrypt", "decrypt"],
  );

  // Random 12-byte IV
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Encrypt
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plaintext,
  );

  // Export raw key
  const rawKey = await crypto.subtle.exportKey("raw", key);

  return {
    ciphertextBase64: arrayBufferToBase64(ciphertext),
    ivBase64: arrayBufferToBase64(iv.buffer),
    rawKeyBase64: arrayBufferToBase64(rawKey),
  };
}

/**
 * Decrypt a face crop using a raw key and IV.
 * Returns the decrypted face as an ArrayBuffer (JPEG bytes).
 */
export async function decryptFace(
  ciphertextBase64: string,
  rawKeyBase64: string,
  ivBase64: string,
): Promise<ArrayBuffer> {
  const ciphertext = base64ToArrayBuffer(ciphertextBase64);
  const rawKey = base64ToArrayBuffer(rawKeyBase64);
  const iv = base64ToArrayBuffer(ivBase64);

  const key = await crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );

  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(iv) },
    key,
    ciphertext,
  );

  return plaintext;
}

// Export helpers for testing
export {
  arrayBufferToBase64 as _arrayBufferToBase64,
  base64ToArrayBuffer as _base64ToArrayBuffer,
};
