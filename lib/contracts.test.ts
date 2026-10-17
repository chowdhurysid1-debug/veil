import { describe, expect, it } from "vitest";

import {
  analyzeOutputSchema,
  analyzeResponseSchema,
  auditEntrySchema,
  clipDetailSchema,
  learningStatsSchema,
  processedClipSchema,
  siteSchema,
  unlockRequestSchema,
  unlockResponseSchema,
  verifyRequestSchema,
  verifyResponseSchema,
} from "./contracts";
import {
  MOCK_ANALYZE_RESPONSE,
  MOCK_AUDIT,
  MOCK_CLIP_DETAIL,
  MOCK_LEARNING_STATS,
  MOCK_SITES,
  MOCK_UNLOCK_RESPONSE,
  MOCK_VERIFY_INTACT,
  MOCK_VERIFY_TAMPERED,
} from "./mock";

describe("mock data matches the contracts", () => {
  it.each([
    ["sites", siteSchema.array(), MOCK_SITES],
    ["clip detail", clipDetailSchema, MOCK_CLIP_DETAIL],
    ["analyze response", analyzeResponseSchema, MOCK_ANALYZE_RESPONSE],
    ["learning stats", learningStatsSchema, MOCK_LEARNING_STATS],
    ["audit", auditEntrySchema.array(), MOCK_AUDIT],
    ["unlock response", unlockResponseSchema, MOCK_UNLOCK_RESPONSE],
    ["verify intact", verifyResponseSchema, MOCK_VERIFY_INTACT],
    ["verify tampered", verifyResponseSchema, MOCK_VERIFY_TAMPERED],
  ] as const)("%s", (_name, schema, value) => {
    expect(schema.safeParse(value).success).toBe(true);
  });
});

describe("contract guards", () => {
  const hash = "a".repeat(64);
  const frame = {
    frameIndex: 0,
    tSeconds: 0,
    blurredJpegBase64: "eA==",
    sha256: hash,
  };
  const clip = {
    filename: "a.mp4",
    capturedAt: "2026-10-16T21:04:00.000Z",
    durationSeconds: 30,
    originalSha256: hash,
    frames: [frame],
    faces: [],
  };

  it("accepts a minimal processed clip", () => {
    expect(processedClipSchema.safeParse(clip).success).toBe(true);
  });

  it("rejects more than 20 frames", () => {
    const frames = Array.from({ length: 21 }, (_, frameIndex) => ({
      ...frame,
      frameIndex,
    }));
    expect(processedClipSchema.safeParse({ ...clip, frames }).success).toBe(
      false,
    );
  });

  it("rejects an unlock reason shorter than 15 characters", () => {
    const result = unlockRequestSchema.safeParse({
      reasonCategory: "other",
      reason: "just looking",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-hex verify hash", () => {
    expect(
      verifyRequestSchema.safeParse({ sha256: "Z".repeat(64) }).success,
    ).toBe(false);
  });

  it("caps AI output at 10 events", () => {
    const event = {
      frameIndex: 0,
      type: "fall",
      confidence: 0.5,
      description: "x",
    };
    expect(
      analyzeOutputSchema.safeParse({ events: Array(11).fill(event) }).success,
    ).toBe(false);
  });
});
