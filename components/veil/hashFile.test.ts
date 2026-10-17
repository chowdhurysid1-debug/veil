import { describe, expect, it } from "vitest";

import { sha256Hex } from "./hashFile";

const TEST_DIGEST =
  "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08";

describe("sha256Hex", () => {
  it("matches the known vector for 'test'", async () => {
    const bytes = new TextEncoder().encode("test");
    expect(await sha256Hex(new Blob([bytes]))).toBe(TEST_DIGEST);
  });

  it("changes when a single byte changes", async () => {
    const bytes = new TextEncoder().encode("tesu");
    expect(await sha256Hex(bytes.buffer)).not.toBe(TEST_DIGEST);
  });
});
