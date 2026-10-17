import { describe, expect, it } from "vitest";

import { decodeBase64, isJpeg, sha256Hex } from "./bytes";

describe("decodeBase64", () => {
  it("decodes valid base64", () => {
    expect(Array.from(decodeBase64("aGk=") ?? [])).toEqual([104, 105]);
  });

  it("rejects bad characters, bad padding, and empty input", () => {
    expect(decodeBase64("")).toBeNull();
    expect(decodeBase64("aGk")).toBeNull();
    expect(decodeBase64("a$k=")).toBeNull();
    expect(decodeBase64("aG=k")).toBeNull();
  });
});

describe("isJpeg", () => {
  it("checks the JPEG start-of-image marker", () => {
    expect(isJpeg(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe(true);
    expect(isJpeg(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe(false);
    expect(isJpeg(new Uint8Array([0xff, 0xd8]))).toBe(false);
  });
});

describe("sha256Hex", () => {
  it("matches the known vector for 'hello'", () => {
    expect(sha256Hex(new TextEncoder().encode("hello"))).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
  });
});
