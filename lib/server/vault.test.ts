import { randomBytes } from "node:crypto";

import { describe, expect, it } from "vitest";

import { unwrapKey, VaultError, wrapKey } from "./vault";

const vaultSecret = "v".repeat(40);
const rawKeyBase64 = randomBytes(32).toString("base64");

describe("face key wrapping", () => {
  it("round-trips a 32-byte key", () => {
    const wrapped = wrapKey(vaultSecret, rawKeyBase64);
    expect(unwrapKey(vaultSecret, wrapped)).toBe(rawKeyBase64);
  });

  it("never stores the raw key in the wrapped value", () => {
    expect(wrapKey(vaultSecret, rawKeyBase64)).not.toContain(rawKeyBase64);
  });

  it("uses a fresh IV each time", () => {
    expect(wrapKey(vaultSecret, rawKeyBase64)).not.toBe(
      wrapKey(vaultSecret, rawKeyBase64),
    );
  });

  it("refuses keys that are not 32 bytes", () => {
    expect(() =>
      wrapKey(vaultSecret, randomBytes(16).toString("base64")),
    ).toThrow(VaultError);
  });

  it("fails closed with the wrong vault secret", () => {
    const wrapped = wrapKey(vaultSecret, rawKeyBase64);
    expect(() => unwrapKey("w".repeat(40), wrapped)).toThrow(VaultError);
  });

  it("fails closed when the wrapped value was altered", () => {
    const [version, iv, tag, sealed] = wrapKey(vaultSecret, rawKeyBase64).split(
      ".",
    );
    const flipped = Buffer.from(sealed, "base64");
    flipped[0] ^= 1;
    const tampered = [version, iv, tag, flipped.toString("base64")].join(".");
    expect(() => unwrapKey(vaultSecret, tampered)).toThrow(VaultError);
    expect(() => unwrapKey(vaultSecret, "garbage")).toThrow(VaultError);
  });
});
