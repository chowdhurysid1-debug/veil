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

// The person model returns one wide box for people standing close together,
// like three students leaning on a wall. A standing person is about a third as
// wide as tall, so a box wider than half its height may hold several heads.
// Someone close to the camera, cut off by the frame, is wide too, but tall.
const GROUP_ASPECT = 0.5;
const GROUP_MAX_FRAME_HEIGHT = 0.75;
const GROUP_BAND_HEIGHT_RATIO = 0.3;

/**
 * Where the head is inside a detected person: top and centred. For a box that
 * may hold a group, a band across its whole width, so no head at the edge is
 * missed. Covers the back of the head and profiles, which a face detector misses.
 */
export function headFromPerson(
  person: PixelBox,
  frameHeight: number,
): PixelBox {
  const isGroup =
    person.width / person.height > GROUP_ASPECT &&
    person.height < frameHeight * GROUP_MAX_FRAME_HEIGHT;
  if (isGroup) {
    return {
      originX: person.originX,
      originY: person.originY,
      width: person.width,
      height: person.height * GROUP_BAND_HEIGHT_RATIO,
    };
  }

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

// On security footage the short-range face model also fires on blank walls with
// boxes a third of the frame wide, at scores of 0.51 to 0.54. A real close-up
// face scored 0.70. A wide box is dropped only when it is also unsure, so a
// confident close-up face is always blurred: an extra box only costs blur.
const LARGE_FACE_WIDTH_RATIO = 0.2;
const LARGE_FACE_MIN_SCORE = 0.65;

export function isPlausibleFace(
  face: PixelBox,
  score: number,
  frameWidth: number,
): boolean {
  if (face.width <= 0) return false;
  const isLarge = face.width > frameWidth * LARGE_FACE_WIDTH_RATIO;
  return !isLarge || score >= LARGE_FACE_MIN_SCORE;
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
