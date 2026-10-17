import type { BoundingBox } from "@/lib/contracts";
import type { ExtractedFrame } from "./extractFrames";
import type { FaceDetection } from "./detectFaces";

const PADDING_RATIO = 0.2;
// Each head is shrunk to this many pixels across, then stretched back with
// smoothing. Nothing that small keeps a recognizable face, at any face size.
const SMEAR_PX = 5;

export interface BlurredFrame {
  frameIndex: number;
  tSeconds: number;
  blob: Blob;
}

let smearCanvas: HTMLCanvasElement | null = null;

/**
 * Blur every head in place on a canvas that already holds the frame.
 * Shared by the stills and the blurred video, so both hide faces the same way.
 */
export function blurHeads(
  ctx: CanvasRenderingContext2D,
  boxes: BoundingBox[],
): void {
  const { width, height } = ctx.canvas;
  smearCanvas ??= document.createElement("canvas");
  const smearCtx = smearCanvas.getContext("2d");
  if (!smearCtx) throw new Error("Canvas 2D context not available.");

  for (const bbox of boxes) {
    const px = bboxToPixels(bbox, width, height);
    if (px.w <= 0 || px.h <= 0) continue;

    const longest = Math.max(px.w, px.h);
    smearCanvas.width = Math.max(2, Math.round((SMEAR_PX * px.w) / longest));
    smearCanvas.height = Math.max(2, Math.round((SMEAR_PX * px.h) / longest));
    smearCtx.imageSmoothingQuality = "high";
    smearCtx.drawImage(
      ctx.canvas,
      px.x,
      px.y,
      px.w,
      px.h,
      0,
      0,
      smearCanvas.width,
      smearCanvas.height,
    );

    // The whole padded rectangle, not an ellipse inside it: a merged box can
    // hold a second head in its corner.
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(smearCanvas, px.x, px.y, px.w, px.h);
    ctx.restore();
  }
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

    blurHeads(ctx, facesByFrame.get(frame.frameIndex) ?? []);

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
