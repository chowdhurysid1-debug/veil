import { describe, expect, it } from "vitest";

import { createDailyCap } from "./dailyCap";

describe("createDailyCap", () => {
  it("allows calls up to the limit, then blocks", () => {
    const now = () => new Date("2026-10-17T10:00:00Z");
    const cap = createDailyCap(3, now);

    expect([cap.tryConsume(), cap.tryConsume(), cap.tryConsume()]).toEqual([
      true,
      true,
      true,
    ]);
    expect(cap.tryConsume()).toBe(false);
    expect(cap.tryConsume()).toBe(false);
  });

  it("resets when the UTC day changes", () => {
    let current = new Date("2026-10-17T23:59:00Z");
    const cap = createDailyCap(1, () => current);

    expect(cap.tryConsume()).toBe(true);
    expect(cap.tryConsume()).toBe(false);

    current = new Date("2026-10-18T00:00:01Z");
    expect(cap.tryConsume()).toBe(true);
  });
});
