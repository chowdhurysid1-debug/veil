import { describe, expect, it } from "vitest";
import {
  encryptFace,
  decryptFace,
  _arrayBufferToBase64,
  _base64ToArrayBuffer,
} from "./faceVault";

describe("base64 round-trip", () => {
  it("encodes and decodes to identical bytes", () => {
    const original = new Uint8Array([72, 101, 108, 108, 111]);
    const b64 = _arrayBufferToBase64(original.buffer);
    const decoded = new Uint8Array(_base64ToArrayBuffer(b64));
    expect(decoded).toEqual(original);
  });

  it("handles empty buffer", () => {
    const empty = new Uint8Array(0);
    const b64 = _arrayBufferToBase64(empty.buffer);
    const decoded = new Uint8Array(_base64ToArrayBuffer(b64));
    expect(decoded.length).toBe(0);
  });
});

describe("encrypt and decrypt round-trip", () => {
  it("decrypted bytes match original", async () => {
    const originalBytes = new Uint8Array([
      255, 216, 255, 224, 0, 16, 74, 70, 73, 70,
    ]); // Fake JPEG header
    const blob = new Blob([originalBytes], { type: "image/jpeg" });

    const encrypted = await encryptFace(blob);

    // Check all fields are non-empty base64
    expect(encrypted.ciphertextBase64.length).toBeGreaterThan(0);
    expect(encrypted.ivBase64.length).toBeGreaterThan(0);
    expect(encrypted.rawKeyBase64.length).toBeGreaterThan(0);

    // IV should be 12 bytes (16 chars base64)
    const ivBytes = new Uint8Array(_base64ToArrayBuffer(encrypted.ivBase64));
    expect(ivBytes.length).toBe(12);

    // Raw key should be 32 bytes (256 bits)
    const keyBytes = new Uint8Array(
      _base64ToArrayBuffer(encrypted.rawKeyBase64),
    );
    expect(keyBytes.length).toBe(32);

    // Decrypt and compare
    const decrypted = await decryptFace(
      encrypted.ciphertextBase64,
      encrypted.rawKeyBase64,
      encrypted.ivBase64,
    );

    expect(new Uint8Array(decrypted)).toEqual(originalBytes);
  });

  it("different encryptions produce different ciphertexts", async () => {
    const blob = new Blob([new Uint8Array([1, 2, 3])], {
      type: "image/jpeg",
    });

    const enc1 = await encryptFace(blob);
    const enc2 = await encryptFace(blob);

    // Different keys and IVs, so ciphertext should differ
    expect(enc1.rawKeyBase64).not.toBe(enc2.rawKeyBase64);
    expect(enc1.ivBase64).not.toBe(enc2.ivBase64);
    expect(enc1.ciphertextBase64).not.toBe(enc2.ciphertextBase64);
  });

  it("decryption with wrong key fails", async () => {
    const blob = new Blob([new Uint8Array([1, 2, 3])], {
      type: "image/jpeg",
    });

    const encrypted = await encryptFace(blob);
    const wrongBlob = new Blob([new Uint8Array([9, 9, 9])], {
      type: "image/jpeg",
    });
    const wrongEncrypted = await encryptFace(wrongBlob);

    await expect(
      decryptFace(
        encrypted.ciphertextBase64,
        wrongEncrypted.rawKeyBase64, // wrong key
        encrypted.ivBase64,
      ),
    ).rejects.toThrow();
  });
});
