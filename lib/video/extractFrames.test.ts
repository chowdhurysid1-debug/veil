import { describe, expect, it } from "vitest";
import { computeSampleTimes } from "./extractFrames";

describe("computeSampleTimes", () => {
  it("returns empty for zero or negative duration", () => {
    expect(computeSampleTimes(0)).toEqual([]);
    expect(computeSampleTimes(-5)).toEqual([]);
  });

  it("returns [0] for a clip under half a second", () => {
    expect(computeSampleTimes(0.4)).toEqual([0]);
  });

  it("samples a short clip twice a second, so a one-second shove is seen", () => {
    expect(computeSampleTimes(5)).toEqual([
      0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5,
    ]);
  });

  it("spreads 20 frames over a 10-second clip", () => {
    const times = computeSampleTimes(10);
    expect(times).toHaveLength(20);
    expect(times[19]).toBe(9.5);
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
