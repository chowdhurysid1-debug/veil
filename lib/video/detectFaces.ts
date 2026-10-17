import type { BoundingBox } from "@/lib/contracts";
import type { ExtractedFrame } from "./extractFrames";
import {
  faceTiles,
  headFromPerson,
  mergeBoxes,
  normalizeBox,
  type PixelBox,
} from "./headBoxes";

export interface FaceDetection {
  frameIndex: number;
  bbox: BoundingBox;
}

export interface DetectFacesResult {
  faces: FaceDetection[];
  totalFaces: number;
}

/** Anything MediaPipe can read pixels from, with its size. */
export type DetectableImage = (
  ImageBitmap | HTMLCanvasElement | OffscreenCanvas
) & {
  width: number;
  height: number;
};

interface Detector {
  detect(image: TexImageSource): {
    detections: Array<{ boundingBox?: PixelBox }>;
  };
}

interface Detectors {
  faces: Detector;
  people: Detector;
}

// Singleton holder for lazy initialization
let detectorsPromise: Promise<Detectors> | null = null;

const WASM_CDN =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.0/wasm";
const FACE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite";
const PERSON_MODEL =
  "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite";

// Low on purpose: a missed person is an unblurred face, an extra box is only extra blur.
const PERSON_SCORE_THRESHOLD = 0.3;
const MAX_PEOPLE = 25;
const TILE_WIDTH_PX = 640;

async function getDetectors(): Promise<Detectors> {
  if (!detectorsPromise) {
    detectorsPromise = (async () => {
      try {
        const { FilesetResolver, FaceDetector, ObjectDetector } =
          await import("@mediapipe/tasks-vision");
        const vision = await FilesetResolver.forVisionTasks(WASM_CDN);
        const [faces, people] = await Promise.all([
          FaceDetector.createFromOptions(vision, {
            baseOptions: { modelAssetPath: FACE_MODEL, delegate: "CPU" },
            runningMode: "IMAGE",
            minDetectionConfidence: 0.5,
          }),
          ObjectDetector.createFromOptions(vision, {
            baseOptions: { modelAssetPath: PERSON_MODEL, delegate: "CPU" },
            runningMode: "IMAGE",
            scoreThreshold: PERSON_SCORE_THRESHOLD,
            categoryAllowlist: ["person"],
            maxResults: MAX_PEOPLE,
          }),
        ]);
        return {
          faces: faces as unknown as Detector,
          people: people as unknown as Detector,
        };
      } catch {
        detectorsPromise = null;
        throw new Error(
          "Face detection model failed to load. Check your network connection.",
        );
      }
    })();
  }
  return detectorsPromise;
}

function createTileCanvas(width: number, height: number) {
  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(width, height);
  }
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
  return null;
}

/** Faces too small for the short-range model, found by upscaling each tile. */
function detectInTiles(detector: Detector, image: DetectableImage): PixelBox[] {
  const found: PixelBox[] = [];
  for (const tile of faceTiles(image.width, image.height)) {
    const scale = TILE_WIDTH_PX / tile.width;
    const canvas = createTileCanvas(
      TILE_WIDTH_PX,
      Math.round(tile.height * scale),
    );
    // Only the Node test runner has no canvas; every browser has one.
    if (!canvas) return found;
    const ctx = canvas.getContext("2d") as
      CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
    if (!ctx) return found;
    ctx.drawImage(
      image,
      tile.originX,
      tile.originY,
      tile.width,
      tile.height,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    for (const { boundingBox: box } of detector.detect(canvas).detections) {
      if (!box) continue;
      found.push({
        originX: tile.originX + box.originX / scale,
        originY: tile.originY + box.originY / scale,
        width: box.width / scale,
        height: box.height / scale,
      });
    }
  }
  return found;
}

/**
 * Every head in one image, as normalized boxes. Three passes, merged:
 * faces on the full frame, faces on upscaled tiles for people far from the
 * camera, and the head region of every detected person for turned heads.
 */
export async function detectHeads(
  image: DetectableImage,
): Promise<BoundingBox[]> {
  const { faces, people } = await getDetectors();
  const pixelBoxes: PixelBox[] = [];

  for (const { boundingBox } of faces.detect(image).detections) {
    if (boundingBox) pixelBoxes.push(boundingBox);
  }
  pixelBoxes.push(...detectInTiles(faces, image));
  for (const { boundingBox } of people.detect(image).detections) {
    if (boundingBox) pixelBoxes.push(headFromPerson(boundingBox));
  }

  return mergeBoxes(
    pixelBoxes.map((box) => normalizeBox(box, image.width, image.height)),
  );
}

/**
 * Detect heads in all extracted frames.
 * Returns normalized bounding boxes (0..1) per the contracts.
 * Fails closed: if the model cannot load, throws instead of silently
 * returning zero faces, which would let unblurred frames through.
 */
export async function detectFaces(
  frames: ExtractedFrame[],
  onProgress?: (done: number, total: number) => void,
): Promise<DetectFacesResult> {
  await getDetectors();

  const allFaces: FaceDetection[] = [];

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    for (const bbox of await detectHeads(frame.bitmap)) {
      allFaces.push({ frameIndex: frame.frameIndex, bbox });
    }
    onProgress?.(i + 1, frames.length);
  }

  return { faces: allFaces, totalFaces: allFaces.length };
}

/** Reset the cached detectors (useful for testing). */
export function resetDetector(): void {
  detectorsPromise = null;
}
