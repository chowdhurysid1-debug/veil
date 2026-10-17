import {
  ALL_FORMATS,
  BlobSource,
  BufferTarget,
  CanvasSink,
  CanvasSource,
  getFirstEncodableVideoCodec,
  Input,
  Mp4OutputFormat,
  Output,
  QUALITY_MEDIUM,
} from "mediabunny";

import { FRAME_WIDTH_PX, type BoundingBox } from "@/lib/contracts";
import { blurHeads } from "./blurFaces";
import { detectHeads } from "./detectFaces";
import { mergeBoxes } from "./headBoxes";

export const VIDEO_FPS = 10;
// Every output frame runs the head detectors, so long clips keep their stills only.
export const MAX_VIDEO_SECONDS = 60;
export const VIDEO_CONTENT_TYPE = "video/mp4";

/** Output frame times, VIDEO_FPS apart, covering the whole clip. */
export function videoSampleTimes(
  durationSeconds: number,
  fps: number = VIDEO_FPS,
): number[] {
  if (!(durationSeconds > 0)) return [];
  const count = Math.max(1, Math.floor(durationSeconds * fps));
  return Array.from({ length: count }, (_, i) => i / fps);
}

/** Encoders need even dimensions. Height follows the source aspect ratio. */
export function evenHeight(
  sourceWidth: number,
  sourceHeight: number,
  width: number = FRAME_WIDTH_PX,
): number {
  return Math.max(2, Math.round((width * sourceHeight) / sourceWidth / 2) * 2);
}

/**
 * Each frame is blurred with its own head boxes plus those of the frames
 * before and after it, so a head the detectors miss for one frame stays hidden.
 */
export function boxesWithNeighbours(
  previous: BoundingBox[],
  current: BoundingBox[],
  next: BoundingBox[],
): BoundingBox[] {
  return mergeBoxes([...previous, ...current, ...next]);
}

interface PendingFrame {
  bitmap: ImageBitmap;
  boxes: BoundingBox[];
  timestamp: number;
}

/**
 * Re-encode the clip at 640px with every head blurred, entirely in this browser.
 * Returns null when the browser cannot decode or encode it, or the clip is too
 * long; the clip then keeps its blurred stills only. Never returns a frame
 * that skipped detection: any detector error is thrown.
 */
export async function renderBlurredVideo(
  file: File,
  onProgress?: (done: number, total: number) => void,
): Promise<Blob | null> {
  const input = new Input({
    source: new BlobSource(file),
    formats: ALL_FORMATS,
  });
  try {
    const track = await input.getPrimaryVideoTrack();
    if (!track || !(await track.canDecode())) return null;

    const durationSeconds = await input.computeDuration();
    if (durationSeconds > MAX_VIDEO_SECONDS) return null;

    const width = FRAME_WIDTH_PX;
    const height = evenHeight(track.displayWidth, track.displayHeight, width);
    const codec = await getFirstEncodableVideoCodec(["avc", "vp9", "av1"], {
      width,
      height,
    });
    if (!codec) return null;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return null;
    const ctx: CanvasRenderingContext2D = context;

    const output = new Output({
      format: new Mp4OutputFormat({ fastStart: "in-memory" }),
      target: new BufferTarget(),
    });
    const source = new CanvasSource(canvas, { codec, quality: QUALITY_MEDIUM });
    output.addVideoTrack(source, { frameRate: VIDEO_FPS });
    await output.start();

    const times = videoSampleTimes(durationSeconds);
    const frameDuration = 1 / VIDEO_FPS;
    const sink = new CanvasSink(track, {
      width,
      height,
      fit: "fill",
      poolSize: 2,
    });

    async function emit(frame: PendingFrame, boxes: BoundingBox[]) {
      ctx.drawImage(frame.bitmap, 0, 0, width, height);
      blurHeads(ctx, boxes);
      frame.bitmap.close();
      await source.add(frame.timestamp, frameDuration);
    }

    let beforePending: BoundingBox[] = [];
    let pending: PendingFrame | null = null;
    let index = 0;
    try {
      for await (const wrapped of sink.canvasesAtTimestamps(times)) {
        const timestamp = times[index];
        index += 1;
        if (!wrapped) continue;

        const bitmap = await createImageBitmap(wrapped.canvas);
        const boxes = await detectHeads(bitmap);
        if (pending) {
          await emit(
            pending,
            boxesWithNeighbours(beforePending, pending.boxes, boxes),
          );
          beforePending = pending.boxes;
        }
        pending = { bitmap, boxes, timestamp };
        onProgress?.(index, times.length);
      }
      if (pending) {
        await emit(
          pending,
          boxesWithNeighbours(beforePending, pending.boxes, []),
        );
        pending = null;
      }
    } finally {
      pending?.bitmap.close();
    }

    await output.finalize();
    const buffer = output.target.buffer;
    return buffer ? new Blob([buffer], { type: VIDEO_CONTENT_TYPE }) : null;
  } finally {
    input.dispose();
  }
}
