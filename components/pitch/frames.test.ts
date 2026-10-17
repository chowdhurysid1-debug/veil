import { describe, expect, it } from "vitest";

import { mockFrameSvg } from "@/lib/mock";

import {
  FEED_FRAMES,
  FEED_SCENARIO,
  HALLWAY_CROP,
  STILL_BBOX,
  STILL_FRAME_INDEX,
  boxInCrop,
  cropSvg,
  withClearFaces,
} from "./frames";

describe("withClearFaces", () => {
  it("replaces the blurred head in a mock frame", () => {
    const svg = mockFrameSvg(STILL_FRAME_INDEX, FEED_SCENARIO);
    expect(svg).toContain('filter="url(#faceblur)"');
    const clear = withClearFaces(svg);
    // Fails if lib/mock.ts changes how it draws heads, so the slider would silently show no face.
    expect(clear).not.toContain('filter="url(#faceblur)"');
    expect(clear).toContain('fill="#d6d3cb"');
  });

  it("leaves a frame with nobody in it unchanged", () => {
    const empty = mockFrameSvg(0, FEED_SCENARIO);
    expect(withClearFaces(empty)).toBe(empty);
  });
});

describe("feed frames", () => {
  it("has a face box on the still frame and none on the empty hallway", () => {
    expect(FEED_FRAMES).toHaveLength(20);
    expect(FEED_FRAMES[STILL_FRAME_INDEX].bbox).not.toBeNull();
    expect(FEED_FRAMES[0].bbox).toBeNull();
  });

  it("places the still frame's face inside the hallway crop", () => {
    const box = boxInCrop(STILL_BBOX, HALLWAY_CROP);
    expect(box.left).toBeGreaterThan(0);
    expect(box.top).toBeGreaterThan(0);
    expect(box.left + box.width).toBeLessThan(100);
    expect(box.top + box.height).toBeLessThan(100);
  });
});

describe("cropSvg", () => {
  it("sets the viewBox to the crop", () => {
    expect(cropSvg("<svg/>", { x: 1, y: 2, width: 3, height: 4 })).toContain(
      'viewBox="1 2 3 4"',
    );
  });
});
