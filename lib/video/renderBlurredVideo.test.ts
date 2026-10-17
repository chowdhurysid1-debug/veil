import { describe, expect, it } from "vitest";

import {
  boxesWithNeighbours,
  evenHeight,
  VIDEO_FPS,
  videoSampleTimes,
} from "./renderBlurredVideo";

describe("videoSampleTimes", () => {
  it("samples the whole clip at the video frame rate", () => {
    const times = videoSampleTimes(2.05);
    expect(times).toHaveLength(2 * VIDEO_FPS);
    expect(times[0]).toBe(0);
    expect(times[1]).toBeCloseTo(1 / VIDEO_FPS, 10);
    expect(times.at(-1)).toBeLessThan(2.05);
  });

  it("returns one frame for a clip shorter than a frame", () => {
    expect(videoSampleTimes(0.04)).toEqual([0]);
  });

  it("returns nothing for an empty or broken duration", () => {
    expect(videoSampleTimes(0)).toEqual([]);
    expect(videoSampleTimes(Number.NaN)).toEqual([]);
  });
});

describe("evenHeight", () => {
  it("keeps 16:9 at 640 wide", () => {
    expect(evenHeight(1920, 1080)).toBe(360);
  });

  it("rounds odd heights to an even number for the encoder", () => {
    expect(evenHeight(1000, 563, 640) % 2).toBe(0);
  });

  it("handles portrait footage", () => {
    expect(evenHeight(1080, 1920)).toBe(1138);
  });
});

describe("boxesWithNeighbours", () => {
  it("blurs a head the detector missed in this frame but found next to it", () => {
    const head = { x: 0.4, y: 0.1, width: 0.05, height: 0.08 };
    expect(boxesWithNeighbours([head], [], [])).toEqual([head]);
    expect(boxesWithNeighbours([], [], [head])).toEqual([head]);
  });

  it("merges the same head across neighbouring frames into one box", () => {
    const merged = boxesWithNeighbours(
      [{ x: 0.4, y: 0.1, width: 0.05, height: 0.08 }],
      [{ x: 0.41, y: 0.1, width: 0.05, height: 0.08 }],
      [{ x: 0.42, y: 0.1, width: 0.05, height: 0.08 }],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].x).toBeCloseTo(0.4, 5);
    expect(merged[0].x + merged[0].width).toBeCloseTo(0.47, 5);
  });
});
