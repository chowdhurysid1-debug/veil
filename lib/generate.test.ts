import { MockLanguageModelV4 } from "ai/test";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GENERATE_FALLBACK } from "./fallbacks";
import { generateSummary } from "./generate";
import { generateInputSchema, MAX_INPUT_CHARS } from "./schemas";

const usage = {
  inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 20, text: 20, reasoning: 0 },
};

function mockModelReturning(text: string) {
  return new MockLanguageModelV4({
    doGenerate: {
      content: [{ type: "text", text }],
      finishReason: { unified: "stop", raw: "end_turn" },
      usage,
      warnings: [],
    },
  });
}

const input = { text: "Our team cut checkout time from 90 seconds to 20." };

describe("generateSummary", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns valid model output untouched", async () => {
    const output = {
      title: "Faster checkout",
      summary: "Checkout now takes 20s.",
      tags: ["ux"],
    };
    const result = await generateSummary(input, {
      model: mockModelReturning(JSON.stringify(output)),
    });

    expect(result).toEqual({ data: output, isFallback: false });
  });

  it("returns the fallback when the model output is not JSON", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await generateSummary(input, {
      model: mockModelReturning("Sure! Here is a summary"),
    });

    expect(result).toEqual({ data: GENERATE_FALLBACK, isFallback: true });
  });

  it("returns the fallback when the JSON does not match the schema", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const wrongShape = JSON.stringify({ title: "", summary: 42, tags: "ux" });
    const result = await generateSummary(input, {
      model: mockModelReturning(wrongShape),
    });

    expect(result).toEqual({ data: GENERATE_FALLBACK, isFallback: true });
  });

  it("returns the fallback when the model call throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const failing = new MockLanguageModelV4({
      doGenerate: async () => {
        throw new Error("upstream 529 overloaded");
      },
    });
    const result = await generateSummary(input, {
      model: failing,
      maxRetries: 0,
    });

    expect(result).toEqual({ data: GENERATE_FALLBACK, isFallback: true });
  });

  it("returns the fallback when the model call times out", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const hanging = new MockLanguageModelV4({
      doGenerate: ({ abortSignal }) =>
        new Promise((_, reject) => {
          abortSignal?.addEventListener("abort", () =>
            reject(abortSignal.reason),
          );
        }),
    });
    const result = await generateSummary(input, {
      model: hanging,
      timeoutMs: 50,
      maxRetries: 0,
    });

    expect(result).toEqual({ data: GENERATE_FALLBACK, isFallback: true });
  });
});

describe("generateInputSchema", () => {
  it("rejects empty and whitespace-only text", () => {
    expect(generateInputSchema.safeParse({ text: "" }).success).toBe(false);
    expect(generateInputSchema.safeParse({ text: "   " }).success).toBe(false);
  });

  it("rejects text over the length limit", () => {
    expect(
      generateInputSchema.safeParse({ text: "a".repeat(MAX_INPUT_CHARS + 1) })
        .success,
    ).toBe(false);
  });

  it("rejects a missing or non-string text field", () => {
    expect(generateInputSchema.safeParse({}).success).toBe(false);
    expect(generateInputSchema.safeParse({ text: 123 }).success).toBe(false);
  });
});
