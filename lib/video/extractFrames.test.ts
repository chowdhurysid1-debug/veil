import { describe, expect, it } from "vitest";
import { computeSampleTimes } from "./extractFrames";

describe("computeSampleTimes", () => {
  it("returns empty for zero or negative duration", () => {
    expect(computeSampleTimes(0)).toEqual([]);
    expect(computeSampleTimes(-5)).toEqual([]);
  });

  it("returns [0] for a sub-second clip", () => {
    expect(computeSampleTimes(0.5)).toEqual([0]);
  });

  it("returns one frame per second for a short clip", () => {
    expect(computeSampleTimes(5)).toEqual([0, 1, 2, 3, 4]);
  });

  it("returns exactly 20 frames for a 20-second clip", () => {
    const times = computeSampleTimes(20);
    expect(times).toHaveLength(20);
    expect(times[0]).toBe(0);
    expect(times[19]).toBe(19);
  });

  it("caps at 20 frames for a 30-second clip", () => {
    const times = computeSampleTimes(30);
    expect(times).toHaveLength(20);
    // Evenly spaced: step = 30/20 = 1.5
    expect(times[0]).toBe(0);
    expect(times[1]).toBe(1.5);
    expect(times[19]).toBe(28.5);
  });

  it("caps at 20 frames for a 120-second clip", () => {
    const times = computeSampleTimes(120);
    expect(times).toHaveLength(20);
    // step = 120/20 = 6
    expect(times[0]).toBe(0);
    expect(times[1]).toBe(6);
    expect(times[19]).toBe(114);
  });

  it("all times are non-negative and less than duration", () => {
    for (const dur of [1, 5, 10, 20, 30, 60, 120, 300]) {
      const times = computeSampleTimes(dur);
      for (const t of times) {
        expect(t).toBeGreaterThanOrEqual(0);
        expect(t).toBeLessThan(dur);
      }
    }
  });

  it("never returns more than 20 samples", () => {
    for (const dur of [1, 10, 20, 21, 50, 100, 600]) {
      expect(computeSampleTimes(dur).length).toBeLessThanOrEqual(20);
    }
  });
});
