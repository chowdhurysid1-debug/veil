// Browser pipeline entry point for the upload screen. Same signature as Tab A's
// processClip(file, onProgress); C9 re-exports theirs from lib/video instead.
// The mock hashes the real file (so Verify works) but draws demo frames.
import type { PipelineProgress, ProcessedClip } from "../../lib/contracts";
import { MOCK_FRAME_COUNT, mockFaceBoxes, mockFrameSvg } from "../../lib/mock";
import { VeilApiError } from "./errors";
import { sha256Hex } from "./hashFile";
import { peekNextMockScenario } from "./mockBackend";

export const MAX_UPLOAD_BYTES = 200 * 1024 * 1024;
const FALLBACK_DURATION_SECONDS = 30;

/** Returns a friendly reason the file can't be used, or null if it can. */
export function rejectFile(file: File): string | null {
  if (!file.type.startsWith("video/")) {
    return "That file isn't a video. Choose an .mp4, .mov, or .webm clip.";
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return "That clip is over 200 MB. Trim it to 30 seconds or less and try again.";
  }
  return null;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    const finish = (seconds: number) => {
      URL.revokeObjectURL(url);
      resolve(seconds);
    };
    video.preload = "metadata";
    video.onloadedmetadata = () =>
      finish(
        Number.isFinite(video.duration) && video.duration > 0
          ? video.duration
          : FALLBACK_DURATION_SECONDS,
      );
    video.onerror = () => finish(FALLBACK_DURATION_SECONDS);
    video.src = url;
  });
}

async function tick(
  onProgress: (progress: PipelineProgress) => void,
  step: PipelineProgress["step"],
  message: string,
  totalMs: number,
) {
  const ticks = 6;
  for (let index = 1; index <= ticks; index++) {
    await wait(totalMs / ticks);
    onProgress({ step, progress: index / ticks, message });
  }
}

export async function processClip(
  file: File,
  onProgress: (progress: PipelineProgress) => void,
): Promise<ProcessedClip> {
  const rejection = rejectFile(file);
  if (rejection) throw new VeilApiError(rejection);

  const scenario = peekNextMockScenario();
  const durationSeconds = await readDuration(file);
  const spacing = durationSeconds / MOCK_FRAME_COUNT;

  await tick(onProgress, "frames", "Sampling 20 frames at 640px", 1100);
  const faceBoxes = mockFaceBoxes(scenario);
  await tick(
    onProgress,
    "faces",
    `Found ${faceBoxes.length} faces across ${MOCK_FRAME_COUNT} frames`,
    1000,
  );
  await tick(onProgress, "blur", "Blurring every face before upload", 600);

  const frames = await Promise.all(
    Array.from({ length: MOCK_FRAME_COUNT }, async (_, frameIndex) => {
      const svg = mockFrameSvg(frameIndex, scenario);
      return {
        frameIndex,
        tSeconds: Math.round(frameIndex * spacing * 100) / 100,
        blurredJpegBase64: btoa(svg),
        sha256: await sha256Hex(new TextEncoder().encode(svg).buffer),
      };
    }),
  );

  await tick(
    onProgress,
    "encrypt",
    `Encrypting ${faceBoxes.length} face crops, one key each`,
    800,
  );
  onProgress({
    step: "hash",
    progress: 0.2,
    message: "Hashing the original file",
  });
  const originalSha256 = await sha256Hex(file);
  await wait(300);
  onProgress({
    step: "hash",
    progress: 1,
    message: "Hashing the original file",
  });
  onProgress({ step: "done", progress: 1, message: "Ready to upload" });

  return {
    filename: file.name.slice(0, 200) || "clip.mp4",
    capturedAt: new Date(file.lastModified || Date.now()).toISOString(),
    durationSeconds,
    originalSha256,
    frames,
    faces: faceBoxes.map((face) => ({
      ...face,
      ciphertextBase64: "bW9jay1jaXBoZXJ0ZXh0",
      ivBase64: "bW9jay1pdg==",
      rawKeyBase64: "bW9jay1rZXktbm90LXJlYWw=",
    })),
  };
}
