import { describe, expect, it } from "vitest";

import { boundingBoxSchema } from "@/lib/contracts";
import {
  headFromPerson,
  isPlausibleFace,
  mergeBoxes,
  normalizeBox,
} from "./headBoxes";

describe("headFromPerson", () => {
  it("puts the head at the top centre of a standing person", () => {
    const head = headFromPerson(
      { originX: 100, originY: 50, width: 100, height: 400 },
      1080,
    );
    expect(head.originY).toBe(50);
    // Width is capped by the shoulders: 0.62 * 100.
    expect(head.width).toBeCloseTo(62, 5);
    expect(head.originX + head.width / 2).toBeCloseTo(150, 5);
  });

  it("keeps the head inside a person cut off at the waist", () => {
    const person = { originX: 0, originY: 0, width: 300, height: 320 };
    const head = headFromPerson(person, 360);
    expect(head.width).toBeLessThanOrEqual(person.width);
    expect(head.height).toBeLessThanOrEqual(person.height);
  });

  // Seen on real footage: three students leaning on a wall came back as one
  // box, and a centred head box left the two outer faces unblurred.
  it("blurs a band across the whole width of a box that may hold a group", () => {
    const group = { originX: 140, originY: 115, width: 143, height: 256 };
    const band = headFromPerson(group, 360);
    expect(band.originX).toBe(140);
    expect(band.width).toBe(143);
    expect(band.height).toBeCloseTo(256 * 0.3, 5);
  });

  it("keeps a centred head for one person close to the camera", () => {
    const close = { originX: 250, originY: 70, width: 220, height: 296 };
    const head = headFromPerson(close, 360);
    expect(head.width).toBeLessThan(close.width);
  });
});

describe("isPlausibleFace", () => {
  it("keeps faces the size a fixed camera sees", () => {
    expect(
      isPlausibleFace(
        { originX: 300, originY: 40, width: 60, height: 70 },
        640,
      ),
    ).toBe(true);
  });

  // Seen on real hallway footage: a 250px "face" on a blank wall.
  it("drops wall-sized false positives", () => {
    expect(
      isPlausibleFace(
        { originX: 10, originY: 0, width: 250, height: 250 },
        640,
      ),
    ).toBe(false);
  });
});

describe("normalizeBox", () => {
  it("clamps boxes that spill past the frame edge", () => {
    const box = normalizeBox(
      { originX: -20, originY: 300, width: 100, height: 100 },
      640,
      360,
    );
    expect(boundingBoxSchema.safeParse(box).success).toBe(true);
    expect(box.x).toBe(0);
    expect(box.y + box.height).toBe(1);
  });
});

describe("mergeBoxes", () => {
  it("merges two detections of the same head into one box covering both", () => {
    const merged = mergeBoxes([
      { x: 0.1, y: 0.1, width: 0.1, height: 0.1 },
      { x: 0.12, y: 0.11, width: 0.08, height: 0.12 },
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].x).toBeCloseTo(0.1, 5);
    expect(merged[0].y + merged[0].height).toBeCloseTo(0.23, 5);
  });

  it("keeps separate heads separate", () => {
    const merged = mergeBoxes([
      { x: 0.1, y: 0.1, width: 0.1, height: 0.1 },
      { x: 0.6, y: 0.1, width: 0.1, height: 0.1 },
    ]);
    expect(merged).toHaveLength(2);
  });

  it("drops empty boxes", () => {
    expect(mergeBoxes([{ x: 0.5, y: 0.5, width: 0, height: 0.1 }])).toEqual([]);
  });
});
