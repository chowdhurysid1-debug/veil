import { describe, expect, it } from "vitest";
import { _bboxToPixels } from "./blurFaces";

describe("bboxToPixels", () => {
  it("converts normalized bbox to pixel coords with 20% padding", () => {
    const bbox = { x: 0.25, y: 0.25, width: 0.5, height: 0.5 };
    const result = _bboxToPixels(bbox, 640, 480);

    // Padding: 0.5 * 0.2 = 0.1 on each side
    // x: (0.25 - 0.1) * 640 = 96
    // y: (0.25 - 0.1) * 480 = 72
    // x2: (0.25 + 0.5 + 0.1) * 640 = 544
    // y2: (0.25 + 0.5 + 0.1) * 480 = 408
    expect(result.x).toBe(96);
    expect(result.y).toBe(72);
    expect(result.w).toBe(544 - 96); // 448
    expect(result.h).toBe(408 - 72); // 336
  });

  it("clamps to canvas boundaries", () => {
    const bbox = { x: 0, y: 0, width: 1, height: 1 };
    const result = _bboxToPixels(bbox, 640, 480);

    // With padding, x would go negative but clamps to 0
    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
    expect(result.w).toBeLessThanOrEqual(640);
    expect(result.h).toBeLessThanOrEqual(480);
  });

  it("handles small faces", () => {
    const bbox = { x: 0.5, y: 0.5, width: 0.05, height: 0.05 };
    const result = _bboxToPixels(bbox, 640, 480);

    expect(result.w).toBeGreaterThan(0);
    expect(result.h).toBeGreaterThan(0);
    expect(result.x).toBeGreaterThanOrEqual(0);
    expect(result.y).toBeGreaterThanOrEqual(0);
  });
});
