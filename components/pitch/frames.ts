// Synthetic CCTV frames for the pitch visuals, built from the same generator
// the app's demo uses (lib/mock.ts). No real people anywhere.
import type { BoundingBox } from "@/lib/contracts";
import {
  MOCK_SCENARIOS,
  mockFaceBoxes,
  mockFrameSvg,
  svgToDataUrl,
  type MockScenario,
} from "@/lib/mock";

const FRAME_WIDTH = 640;
const FRAME_HEIGHT = 360;

// The blurred head mockFrameSvg draws for every person.
const BLURRED_HEAD =
  /<circle cx="([\d.]+)" cy="([\d.]+)" r="(\d+)" fill="#a1a1aa" filter="url\(#faceblur\)"\/>/g;

export interface Crop {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FeedFrame {
  src: string;
  /** Face box as fractions of the frame, or null when nobody is in view. */
  bbox: BoundingBox | null;
}

/** The hallway scenario the hook and close slides loop through. */
export const FEED_SCENARIO: MockScenario = MOCK_SCENARIOS[0];

/** A frame where the person stands mid-hallway, facing the camera. */
export const STILL_FRAME_INDEX = 7;

/** Replaces each blurred head with a sharp, simple face: what stored footage keeps. */
export function withClearFaces(svg: string): string {
  return svg.replace(BLURRED_HEAD, (_match, cxText, cyText, rText) => {
    const cx = Number(cxText);
    const cy = Number(cyText);
    const r = Number(rText);
    const eyeY = cy - r * 0.1;
    const eyeDx = r * 0.36;
    const eyeR = r * 0.13;
    return (
      `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#d6d3cb"/>` +
      `<path d="M${cx - r} ${cy - r * 0.15}a${r} ${r} 0 0 1 ${r * 2} 0c-${r * 0.5}-${r * 0.55}-${r * 1.5}-${r * 0.55}-${r * 2} 0z" fill="#3a3a36"/>` +
      `<circle cx="${cx - eyeDx}" cy="${eyeY}" r="${eyeR}" fill="#16171b"/>` +
      `<circle cx="${cx + eyeDx}" cy="${eyeY}" r="${eyeR}" fill="#16171b"/>` +
      `<path d="M${cx - r * 0.35} ${cy + r * 0.42}q${r * 0.35} ${r * 0.25} ${r * 0.7} 0" stroke="#16171b" stroke-width="${r * 0.1}" fill="none" stroke-linecap="round"/>`
    );
  });
}

/** Wraps a full frame in an outer SVG that shows only `crop`. */
export function cropSvg(svg: string, crop: Crop): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${crop.x} ${crop.y} ${crop.width} ${crop.height}">` +
    svg +
    `</svg>`
  );
}

/** Where a frame-relative face box lands inside a crop, in percent. */
export function boxInCrop(bbox: BoundingBox, crop: Crop) {
  return {
    left: ((bbox.x * FRAME_WIDTH - crop.x) / crop.width) * 100,
    top: ((bbox.y * FRAME_HEIGHT - crop.y) / crop.height) * 100,
    width: ((bbox.width * FRAME_WIDTH) / crop.width) * 100,
    height: ((bbox.height * FRAME_HEIGHT) / crop.height) * 100,
  };
}

function buildFeed(scenario: MockScenario): FeedFrame[] {
  const boxes = new Map(
    mockFaceBoxes(scenario).map(({ frameIndex, bbox }) => [frameIndex, bbox]),
  );
  return Array.from({ length: 20 }, (_, frameIndex) => ({
    src: svgToDataUrl(mockFrameSvg(frameIndex, scenario)),
    bbox: boxes.get(frameIndex) ?? null,
  }));
}

export const FEED_FRAMES = buildFeed(FEED_SCENARIO);

const STILL_SVG = mockFrameSvg(STILL_FRAME_INDEX, FEED_SCENARIO);

/** Face box of the still frame. */
export const STILL_BBOX: BoundingBox =
  FEED_FRAMES[STILL_FRAME_INDEX].bbox ??
  ({ x: 0, y: 0, width: 0, height: 0 } satisfies BoundingBox);

/** Hallway around the person, for the before/after slider. */
export const HALLWAY_CROP: Crop = { x: 290, y: 78, width: 260, height: 170 };

/** Tight crop of the head and shoulders, for small thumbnails. */
export const HEAD_CROP: Crop = {
  x: STILL_BBOX.x * FRAME_WIDTH - 18,
  y: STILL_BBOX.y * FRAME_HEIGHT - 14,
  width: 80,
  height: 80,
};

export const STILL = {
  blurred: svgToDataUrl(cropSvg(STILL_SVG, HALLWAY_CROP)),
  clear: svgToDataUrl(cropSvg(withClearFaces(STILL_SVG), HALLWAY_CROP)),
  headBlurred: svgToDataUrl(cropSvg(STILL_SVG, HEAD_CROP)),
  headClear: svgToDataUrl(cropSvg(withClearFaces(STILL_SVG), HEAD_CROP)),
};
