import { describe, expect, it } from "vitest";
import { encryptFace, decryptFace } from "./faceVault";

describe("decryptFace unlock flow", () => {
  it("simulates the full unlock sequence: server returns key+iv+url, browser decrypts", async () => {
    // Simulate: original face crop (e.g. a JPEG of someone's face)
    const fakeJpeg = new Uint8Array(256);
    for (let i = 0; i < fakeJpeg.length; i++) {
      fakeJpeg[i] = i % 256;
    }
    const faceBlob = new Blob([fakeJpeg], { type: "image/jpeg" });

    // Pipeline encrypts the face
    const encrypted = await encryptFace(faceBlob);

    // Server stores ciphertextBase64 in storage, wraps the key.
    // On unlock, server returns: rawKeyBase64, ivBase64, and a signed URL to the ciphertext.
    // The UI fetches the ciphertext from the URL and calls decryptFace.
    const decrypted = await decryptFace(
      encrypted.ciphertextBase64,
      encrypted.rawKeyBase64,
      encrypted.ivBase64,
    );

    // The decrypted bytes match the original face crop exactly
    const decryptedArray = new Uint8Array(decrypted);
    expect(decryptedArray).toEqual(fakeJpeg);

    // The UI can create a blob URL from the decrypted data
    const blob = new Blob([decrypted], { type: "image/jpeg" });
    expect(blob.size).toBe(fakeJpeg.length);
  });

  it("handles a 1-byte face crop", async () => {
    const tiny = new Blob([new Uint8Array([42])], { type: "image/jpeg" });
    const enc = await encryptFace(tiny);
    const dec = await decryptFace(
      enc.ciphertextBase64,
      enc.rawKeyBase64,
      enc.ivBase64,
    );
    expect(new Uint8Array(dec)).toEqual(new Uint8Array([42]));
  });

  it("handles a large face crop (100 KB)", async () => {
    const largeData = new Uint8Array(100 * 1024);
    for (let i = 0; i < largeData.length; i++) {
      largeData[i] = (i * 7 + 13) % 256;
    }
    const blob = new Blob([largeData], { type: "image/jpeg" });
    const enc = await encryptFace(blob);
    const dec = await decryptFace(
      enc.ciphertextBase64,
      enc.rawKeyBase64,
      enc.ivBase64,
    );
    expect(new Uint8Array(dec)).toEqual(largeData);
  });
});
