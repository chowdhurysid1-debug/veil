import { describe, expect, it } from "vitest";
import { sha256, sha256File } from "./hash";

describe("sha256", () => {
  // Known vector: SHA-256 of empty string is e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  it("matches known vector for empty input", async () => {
    const result = await sha256(new ArrayBuffer(0));
    expect(result).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });

  // SHA-256 of "hello" is 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
  it("matches known vector for 'hello'", async () => {
    const encoder = new TextEncoder();
    const result = await sha256(encoder.encode("hello").buffer);
    expect(result).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
  });

  it("produces 64-character lowercase hex string", async () => {
    const result = await sha256(new Uint8Array([1, 2, 3]).buffer);
    expect(result).toMatch(/^[a-f0-9]{64}$/);
  });

  it("accepts Blob input", async () => {
    const blob = new Blob(["hello"], { type: "text/plain" });
    const result = await sha256(blob);
    expect(result).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
  });
});

describe("sha256File", () => {
  it("hashes a File the same as its raw bytes", async () => {
    const content = new Uint8Array([10, 20, 30, 40, 50]);
    const file = new File([content], "test.bin", {
      type: "application/octet-stream",
    });

    const fileHash = await sha256File(file);
    const bufferHash = await sha256(content.buffer);
    expect(fileHash).toBe(bufferHash);
  });
});
