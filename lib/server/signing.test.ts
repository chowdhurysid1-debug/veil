import { describe, expect, it } from "vitest";

import { isStampValid, signStamp, type ClipStamp } from "./signing";

const secret = "s".repeat(40);
const stamp: ClipStamp = {
  clipId: "5c7e9a1b-2d3f-4a5b-8c6d-7e8f9a0b1c2d",
  sha256: "a".repeat(64),
  capturedAt: "2026-10-16T21:03:30.000Z",
  stampedAt: "2026-10-16T21:04:00.000Z",
};

describe("clip stamps", () => {
  it("verifies a stamp it signed", () => {
    expect(isStampValid(secret, stamp, signStamp(secret, stamp))).toBe(true);
  });

  it("signs the same instant identically whatever the timestamp format", () => {
    const fromPostgres = {
      ...stamp,
      capturedAt: "2026-10-16T21:03:30+00:00",
      stampedAt: "2026-10-16T21:04:00+00:00",
    };
    expect(signStamp(secret, fromPostgres)).toBe(signStamp(secret, stamp));
  });

  it.each([
    ["clip id", { ...stamp, clipId: "6c7e9a1b-2d3f-4a5b-8c6d-7e8f9a0b1c2d" }],
    ["hash", { ...stamp, sha256: `b${"a".repeat(63)}` }],
    ["capture time", { ...stamp, capturedAt: "2026-10-16T21:03:31.000Z" }],
    ["stamp time", { ...stamp, stampedAt: "2026-10-16T21:04:01.000Z" }],
  ])("rejects a changed %s", (_field, changed) => {
    expect(isStampValid(secret, changed, signStamp(secret, stamp))).toBe(false);
  });

  it("rejects a signature made with another secret", () => {
    const forged = signStamp("x".repeat(40), stamp);
    expect(isStampValid(secret, stamp, forged)).toBe(false);
  });

  it("rejects malformed signatures without throwing", () => {
    expect(isStampValid(secret, stamp, "")).toBe(false);
    expect(isStampValid(secret, stamp, "not-hex")).toBe(false);
  });
});
