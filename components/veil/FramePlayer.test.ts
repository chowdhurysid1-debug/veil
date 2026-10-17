import { describe, expect, it } from "vitest";

import { frameIndexAt } from "./FramePlayer";

const frames = [0, 0.5, 1, 1.5].map((tSeconds, index) => ({
  id: `00000000-0000-4000-8000-00000000000${index}`,
  frameIndex: index,
  tSeconds,
  blurredUrl: `https://frames.test/${index}.jpg`,
}));

describe("frameIndexAt", () => {
  it("returns the sampled frame the video is currently showing", () => {
    expect(frameIndexAt(frames, 0)).toBe(0);
    expect(frameIndexAt(frames, 0.49)).toBe(0);
    expect(frameIndexAt(frames, 0.5)).toBe(1);
    expect(frameIndexAt(frames, 1.2)).toBe(2);
  });

  it("stays on the last frame after the final sample", () => {
    expect(frameIndexAt(frames, 9)).toBe(3);
  });
});
