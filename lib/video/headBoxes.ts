import type { BoundingBox } from "@/lib/contracts";

/** A box in pixels, the shape MediaPipe returns. */
export interface PixelBox {
  originX: number;
  originY: number;
  width: number;
  height: number;
}

// A head is about a sixth of a standing person's height and a little taller
// than it is wide. For a person cut off at the knees or waist the box is shorter,
// so the width cap keeps the head from growing past the shoulders.
const HEAD_HEIGHT_RATIO = 0.24;
const HEAD_WIDTH_RATIO = 0.62;
const HEAD_ASPECT = 1.25;

/**
 * Where the head is inside a detected person: top and centred.
 * Covers the back of the head and profiles, which a face detector misses.
 */
export function headFromPerson(person: PixelBox): PixelBox {
  const width = Math.min(
    person.width * HEAD_WIDTH_RATIO,
    person.height * HEAD_HEIGHT_RATIO,
  );
  const height = Math.min(person.height, width * HEAD_ASPECT);
  return {
    originX: person.originX + (person.width - width) / 2,
    originY: person.originY,
    width,
    height,
  };
}

/**
 * Overlapping tiles, each half the frame wide, so small faces are upscaled
 * enough for the short-range face model to see them.
 */
export function faceTiles(frameWidth: number, frameHeight: number): PixelBox[] {
  const width = frameWidth / 2;
  const height = frameHeight / 1.5;
  const tiles: PixelBox[] = [];
  for (const originX of [0, frameWidth / 4, frameWidth / 2]) {
    for (const originY of [0, frameHeight - height]) {
      tiles.push({ originX, originY, width, height });
    }
  }
  return tiles;
}

/** Normalize a pixel box to 0..1 of the frame, clamped inside it. */
export function normalizeBox(
  box: PixelBox,
  frameWidth: number,
  frameHeight: number,
): BoundingBox {
  const x = Math.min(1, Math.max(0, box.originX / frameWidth));
  const y = Math.min(1, Math.max(0, box.originY / frameHeight));
  const right = Math.min(
    1,
    Math.max(0, (box.originX + box.width) / frameWidth),
  );
  const bottom = Math.min(
    1,
    Math.max(0, (box.originY + box.height) / frameHeight),
  );
  return { x, y, width: right - x, height: bottom - y };
}

function overlapRatio(a: BoundingBox, b: BoundingBox): number {
  const left = Math.max(a.x, b.x);
  const top = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  if (right <= left || bottom <= top) return 0;
  const shared = (right - left) * (bottom - top);
  const smaller = Math.min(a.width * a.height, b.width * b.height);
  return smaller === 0 ? 0 : shared / smaller;
}

function union(a: BoundingBox, b: BoundingBox): BoundingBox {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {
    x,
    y,
    width: Math.max(a.x + a.width, b.x + b.width) - x,
    height: Math.max(a.y + a.height, b.y + b.height) - y,
  };
}

// Half of the smaller box inside the other means both found the same head.
const SAME_HEAD_OVERLAP = 0.5;

/**
 * Merge boxes that cover the same head into one box covering both, so a head
 * found by two detectors is blurred once and locked once.
 */
export function mergeBoxes(boxes: BoundingBox[]): BoundingBox[] {
  const merged: BoundingBox[] = [];
  for (const box of boxes) {
    if (box.width <= 0 || box.height <= 0) continue;
    let current = box;
    for (let i = merged.length - 1; i >= 0; i--) {
      if (overlapRatio(current, merged[i]) >= SAME_HEAD_OVERLAP) {
        current = union(current, merged[i]);
        merged.splice(i, 1);
      }
    }
    merged.push(current);
  }
  return merged;
}
