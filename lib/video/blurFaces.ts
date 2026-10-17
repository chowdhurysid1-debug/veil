import type { BoundingBox } from "@/lib/contracts";
import type { ExtractedFrame } from "./extractFrames";
import type { FaceDetection } from "./detectFaces";

const PADDING_RATIO = 0.2;
const BLUR_ITERATIONS = 3;

export interface BlurredFrame {
  frameIndex: number;
  tSeconds: number;
  blob: Blob;
}

/**
 * Apply a box-pass blur to a region of canvas pixels.
 * Run multiple times for an approximation of Gaussian blur.
 */
function boxBlurRegion(
  ctx: CanvasRenderingContext2D,
  rx: number,
  ry: number,
  rw: number,
  rh: number,
  radius: number,
): void {
  if (rw <= 0 || rh <= 0) return;

  const imageData = ctx.getImageData(rx, ry, rw, rh);
  const { data, width, height } = imageData;

  for (let pass = 0; pass < BLUR_ITERATIONS; pass++) {
    // Horizontal pass
    const temp = new Uint8ClampedArray(data.length);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0,
          g = 0,
          b = 0,
          a = 0,
          count = 0;
        for (
          let kx = Math.max(0, x - radius);
          kx <= Math.min(width - 1, x + radius);
          kx++
        ) {
          const idx = (y * width + kx) * 4;
          r += data[idx];
          g += data[idx + 1];
          b += data[idx + 2];
          a += data[idx + 3];
          count++;
        }
        const idx = (y * width + x) * 4;
        temp[idx] = r / count;
        temp[idx + 1] = g / count;
        temp[idx + 2] = b / count;
        temp[idx + 3] = a / count;
      }
    }

    // Vertical pass
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        let r = 0,
          g = 0,
          b = 0,
          a = 0,
          count = 0;
        for (
          let ky = Math.max(0, y - radius);
          ky <= Math.min(height - 1, y + radius);
          ky++
        ) {
          const idx = (ky * width + x) * 4;
          r += temp[idx];
          g += temp[idx + 1];
          b += temp[idx + 2];
          a += temp[idx + 3];
          count++;
        }
        const idx = (y * width + x) * 4;
        data[idx] = r / count;
        data[idx + 1] = g / count;
        data[idx + 2] = b / count;
        data[idx + 3] = a / count;
      }
    }
  }

  ctx.putImageData(imageData, rx, ry);
}

/**
 * Convert a normalized BoundingBox to pixel coords with padding.
 */
function bboxToPixels(
  bbox: BoundingBox,
  canvasWidth: number,
  canvasHeight: number,
): { x: number; y: number; w: number; h: number } {
  const padW = bbox.width * PADDING_RATIO;
  const padH = bbox.height * PADDING_RATIO;

  const x = Math.max(0, Math.floor((bbox.x - padW) * canvasWidth));
  const y = Math.max(0, Math.floor((bbox.y - padH) * canvasHeight));
  const x2 = Math.min(
    canvasWidth,
    Math.ceil((bbox.x + bbox.width + padW) * canvasWidth),
  );
  const y2 = Math.min(
    canvasHeight,
    Math.ceil((bbox.y + bbox.height + padH) * canvasHeight),
  );

  return { x, y, w: x2 - x, h: y2 - y };
}

/**
 * Blur all detected faces on each frame.
 * Faces are blurred with 20% padding before anything leaves the browser.
 * Returns new JPEG blobs with faces blurred.
 */
export async function blurFaces(
  frames: ExtractedFrame[],
  faces: FaceDetection[],
  onProgress?: (done: number, total: number) => void,
): Promise<BlurredFrame[]> {
  // Group faces by frame index for efficient processing
  const facesByFrame = new Map<number, BoundingBox[]>();
  for (const face of faces) {
    const existing = facesByFrame.get(face.frameIndex) ?? [];
    existing.push(face.bbox);
    facesByFrame.set(face.frameIndex, existing);
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context not available.");

  const blurred: BlurredFrame[] = [];

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];

    // Draw original frame
    canvas.width = frame.bitmap.width;
    canvas.height = frame.bitmap.height;
    ctx.drawImage(frame.bitmap, 0, 0);

    // Blur each face region
    const frameFaces = facesByFrame.get(frame.frameIndex) ?? [];
    for (const bbox of frameFaces) {
      const px = bboxToPixels(bbox, canvas.width, canvas.height);
      const blurRadius = Math.max(8, Math.floor(px.w / 4));
      boxBlurRegion(ctx, px.x, px.y, px.w, px.h, blurRadius);
    }

    // Export as JPEG
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Canvas toBlob failed."))),
        "image/jpeg",
        0.85,
      );
    });

    blurred.push({
      frameIndex: frame.frameIndex,
      tSeconds: frame.tSeconds,
      blob,
    });

    onProgress?.(i + 1, frames.length);
  }

  return blurred;
}

// Export for testing
export { bboxToPixels as _bboxToPixels };
