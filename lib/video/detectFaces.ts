import type { BoundingBox } from "@/lib/contracts";
import type { ExtractedFrame } from "./extractFrames";
import {
  headFromPerson,
  isPlausibleFace,
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
    detections: Array<{
      boundingBox?: PixelBox;
      categories?: Array<{ score: number }>;
    }>;
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
// lite2, not lite0: on real hallway footage lite0 missed people walking in a group
// and merged two people standing close into one box.
const PERSON_MODEL =
  "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite2/float16/1/efficientdet_lite2.tflite";

// Low on purpose: a missed person is an unblurred face, an extra box is only extra blur.
// 0.1 catches people half out of frame and groups leaning on a wall, which score 0.1 to 0.3.
const PERSON_SCORE_THRESHOLD = 0.1;
const MAX_PEOPLE = 25;

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

/**
 * Every head in one image, as normalized boxes. Two passes, merged: the head
 * region of every detected person, which covers turned heads and people far
 * from the camera, and faces the face model finds close up.
 */
export async function detectHeads(
  image: DetectableImage,
): Promise<BoundingBox[]> {
  const { faces, people } = await getDetectors();
  const pixelBoxes: PixelBox[] = [];

  for (const { boundingBox, categories } of faces.detect(image).detections) {
    const score = categories?.[0]?.score ?? 1;
    if (boundingBox && isPlausibleFace(boundingBox, score, image.width)) {
      pixelBoxes.push(boundingBox);
    }
  }
  for (const { boundingBox } of people.detect(image).detections) {
    if (boundingBox) {
      pixelBoxes.push(headFromPerson(boundingBox, image.height));
    }
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
