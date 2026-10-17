import { MAX_FRAMES, FRAME_WIDTH_PX } from "@/lib/contracts";

export interface ExtractedFrame {
  frameIndex: number;
  tSeconds: number;
  blob: Blob;
  bitmap: ImageBitmap;
}

/**
 * Compute which seconds to sample from a video.
 * 1 fps, evenly spaced, max MAX_FRAMES.
 */
export function computeSampleTimes(durationSeconds: number): number[] {
  if (durationSeconds <= 0) return [];
  const totalFrames = Math.floor(durationSeconds);
  const count = Math.min(totalFrames, MAX_FRAMES);
  if (count === 0) return durationSeconds > 0 ? [0] : [];

  if (totalFrames <= MAX_FRAMES) {
    return Array.from({ length: count }, (_, i) => i);
  }

  // Evenly space MAX_FRAMES across the duration
  const step = durationSeconds / count;
  return Array.from(
    { length: count },
    (_, i) => Math.round(i * step * 100) / 100,
  );
}

/**
 * Extract JPEG frames from a video file at 1 fps, max 20 frames, 640px wide.
 * Runs entirely in the browser using <video> + <canvas>.
 */
export async function extractFrames(
  file: File,
  onProgress?: (done: number, total: number) => void,
): Promise<{ frames: ExtractedFrame[]; durationSeconds: number }> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;

  try {
    // Wait for metadata
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () =>
        reject(new Error("Could not load video. Check the file format."));
    });

    const durationSeconds = video.duration;
    if (!isFinite(durationSeconds) || durationSeconds <= 0) {
      throw new Error("Video has no duration. It may be corrupt or empty.");
    }

    const sampleTimes = computeSampleTimes(durationSeconds);
    const total = sampleTimes.length;

    // Scale to 640px wide, keeping aspect ratio
    const scale = FRAME_WIDTH_PX / video.videoWidth;
    const canvasWidth = FRAME_WIDTH_PX;
    const canvasHeight = Math.round(video.videoHeight * scale);

    const canvas = document.createElement("canvas");
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context not available.");

    const frames: ExtractedFrame[] = [];

    for (let i = 0; i < sampleTimes.length; i++) {
      const t = sampleTimes[i];
      await seekTo(video, t);

      ctx.drawImage(video, 0, 0, canvasWidth, canvasHeight);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Canvas toBlob failed."))),
          "image/jpeg",
          0.85,
        );
      });

      const bitmap = await createImageBitmap(blob);

      frames.push({ frameIndex: i, tSeconds: t, blob, bitmap });
      onProgress?.(i + 1, total);
    }

    return { frames, durationSeconds };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    video.onseeked = () => resolve();
    video.onerror = () => reject(new Error(`Failed to seek to ${time}s`));
    video.currentTime = time;
  });
}
