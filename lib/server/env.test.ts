import { describe, expect, it } from "vitest";

import { ConfigError, getServerEnv } from "./env";

const valid = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SECRET_KEY: "sb_secret_test_value_123",
  VEIL_SIGNING_SECRET: "s".repeat(40),
  VEIL_VAULT_KEY: "v".repeat(40),
};

describe("getServerEnv", () => {
  it("returns the four values when all are set", () => {
    expect(getServerEnv(valid)).toEqual({
      supabaseUrl: valid.NEXT_PUBLIC_SUPABASE_URL,
      supabaseSecretKey: valid.SUPABASE_SECRET_KEY,
      signingSecret: valid.VEIL_SIGNING_SECRET,
      vaultSecret: valid.VEIL_VAULT_KEY,
    });
  });

  it("names every missing variable", () => {
    expect(() =>
      getServerEnv({ ...valid, SUPABASE_SECRET_KEY: "", VEIL_VAULT_KEY: " " }),
    ).toThrow(/SUPABASE_SECRET_KEY, VEIL_VAULT_KEY/);
  });

  it("rejects short secrets without echoing them", () => {
    const shortSecret = "too-short-secret";
    let caught: unknown;
    try {
      getServerEnv({ ...valid, VEIL_SIGNING_SECRET: shortSecret });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(ConfigError);
    expect(String(caught)).toMatch(/VEIL_SIGNING_SECRET must be at least 32/);
    expect(String(caught)).not.toContain(shortSecret);
  });

  it("rejects using the same value for both secrets", () => {
    expect(() =>
      getServerEnv({ ...valid, VEIL_VAULT_KEY: valid.VEIL_SIGNING_SECRET }),
    ).toThrow(/must be different/);
  });
});
