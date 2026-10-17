import type { BoundingBox } from "@/lib/contracts";
import type { ExtractedFrame } from "./extractFrames";

export interface FaceDetection {
  frameIndex: number;
  bbox: BoundingBox;
}

export interface DetectFacesResult {
  faces: FaceDetection[];
  totalFaces: number;
}

// Singleton holder for lazy initialization
let detectorPromise: Promise<FaceDetectorInstance> | null = null;

interface FaceDetectorInstance {
  detect(image: ImageBitmap): {
    detections: Array<{
      boundingBox?: {
        originX: number;
        originY: number;
        width: number;
        height: number;
      };
    }>;
  };
}

const WASM_CDN =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_CDN =
  "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite";

async function getDetector(): Promise<FaceDetectorInstance> {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      try {
        const { FilesetResolver, FaceDetector } =
          await import("@mediapipe/tasks-vision");
        const vision = await FilesetResolver.forVisionTasks(WASM_CDN);
        const detector = await FaceDetector.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_CDN, delegate: "CPU" },
          runningMode: "IMAGE",
          minDetectionConfidence: 0.5,
        });
        return detector as unknown as FaceDetectorInstance;
      } catch {
        detectorPromise = null;
        throw new Error(
          "Face detection model failed to load. Check your network connection.",
        );
      }
    })();
  }
  return detectorPromise;
}

/**
 * Normalize a MediaPipe pixel bounding box to 0..1 fractions of frame size.
 */
function normalizeBox(
  box: { originX: number; originY: number; width: number; height: number },
  frameWidth: number,
  frameHeight: number,
): BoundingBox {
  return {
    x: Math.max(0, box.originX / frameWidth),
    y: Math.max(0, box.originY / frameHeight),
    width: Math.min(1, box.width / frameWidth),
    height: Math.min(1, box.height / frameHeight),
  };
}

/**
 * Detect faces in all extracted frames.
 * Returns normalized bounding boxes (0..1) per the contracts.
 * If the model fails to load, returns zero faces (graceful fallback).
 */
export async function detectFaces(
  frames: ExtractedFrame[],
  onProgress?: (done: number, total: number) => void,
): Promise<DetectFacesResult> {
  let detector: FaceDetectorInstance;
  try {
    detector = await getDetector();
  } catch {
    // Fallback: no faces found
    return { faces: [], totalFaces: 0 };
  }

  const allFaces: FaceDetection[] = [];

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    const result = detector.detect(frame.bitmap);

    for (const detection of result.detections) {
      if (!detection.boundingBox) continue;
      const bbox = normalizeBox(
        detection.boundingBox,
        frame.bitmap.width,
        frame.bitmap.height,
      );
      allFaces.push({ frameIndex: frame.frameIndex, bbox });
    }

    onProgress?.(i + 1, frames.length);
  }

  return { faces: allFaces, totalFaces: allFaces.length };
}

/** Reset the cached detector (useful for testing). */
export function resetDetector(): void {
  detectorPromise = null;
}
