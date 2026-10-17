import type {
  ProcessedClip,
  ProcessedFrame,
  LockedFace,
  PipelineProgress,
} from "@/lib/contracts";
import { extractFrames } from "./extractFrames";
import { detectFaces } from "./detectFaces";
import { blurFaces } from "./blurFaces";
import { encryptFace } from "@/lib/crypto/faceVault";
import { sha256, sha256File } from "@/lib/crypto/hash";
import { _arrayBufferToBase64 } from "@/lib/crypto/faceVault";

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB
const MAX_DURATION_SECONDS = 300; // 5 minutes

export class PipelineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PipelineError";
  }
}

/**
 * Process a video clip through the full pipeline:
 * 1. Extract frames (up to 2 fps, max 20, 640px wide)
 * 2. Detect heads (MediaPipe faces, tiled faces, and people)
 * 3. Blur faces on canvas
 * 4. Encrypt each face crop (AES-GCM 256)
 * 5. Hash original file + each blurred frame (SHA-256)
 *
 * Returns a ProcessedClip matching the contract schema.
 */
export async function processClip(
  file: File,
  onProgress?: (progress: PipelineProgress) => void,
): Promise<ProcessedClip> {
  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new PipelineError(
      `File too large (${Math.round(file.size / 1024 / 1024)} MB). Maximum is 500 MB.`,
    );
  }

  // Validate file type
  if (!file.type.startsWith("video/")) {
    throw new PipelineError(
      "This file does not appear to be a video. Upload an MP4, WebM, or MOV file.",
    );
  }

  const report = (
    step: PipelineProgress["step"],
    progress: number,
    message: string,
  ) => {
    onProgress?.({ step, progress, message });
  };

  // Step 1: Extract frames
  report("frames", 0, "Extracting frames from video...");
  let extracted;
  try {
    extracted = await extractFrames(file, (done, total) => {
      report("frames", done / total, `Extracting frame ${done}/${total}`);
    });
  } catch {
    throw new PipelineError(
      "Could not extract frames from this video. The codec may not be supported by your browser.",
    );
  }

  if (extracted.frames.length === 0) {
    throw new PipelineError("No frames could be extracted from this video.");
  }

  if (extracted.durationSeconds > MAX_DURATION_SECONDS) {
    // Release bitmaps before throwing
    for (const frame of extracted.frames) {
      frame.bitmap.close();
    }
    throw new PipelineError(
      `Video is too long (${Math.round(extracted.durationSeconds)}s). Maximum is ${MAX_DURATION_SECONDS} seconds.`,
    );
  }

  // Step 2: Detect faces (fail closed: if detection is unavailable, stop the pipeline)
  report("faces", 0, "Detecting faces...");
  let detectionResult;
  try {
    detectionResult = await detectFaces(extracted.frames, (done, total) => {
      report(
        "faces",
        done / total,
        `Scanning frame ${done}/${total} for faces`,
      );
    });
  } catch {
    for (const frame of extracted.frames) {
      frame.bitmap.close();
    }
    throw new PipelineError(
      "Face detection is unavailable. Cannot process video without it, because unblurred faces would be uploaded.",
    );
  }

  // Step 3: Blur faces
  report("blur", 0, "Blurring faces...");
  const blurredFrames = await blurFaces(
    extracted.frames,
    detectionResult.faces,
    (done, total) => {
      report("blur", done / total, `Blurring frame ${done}/${total}`);
    },
  );

  // Step 4: Encrypt each face crop
  report("encrypt", 0, "Encrypting face crops...");
  const lockedFaces: LockedFace[] = [];

  if (detectionResult.faces.length > 0) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new PipelineError("Canvas 2D context not available.");

    for (let i = 0; i < detectionResult.faces.length; i++) {
      const face = detectionResult.faces[i];
      const frame = extracted.frames[face.frameIndex];

      // Crop the face from the ORIGINAL (unblurred) frame
      const bw = frame.bitmap.width;
      const bh = frame.bitmap.height;
      const cropX = Math.max(0, Math.floor(face.bbox.x * bw));
      const cropY = Math.max(0, Math.floor(face.bbox.y * bh));
      const cropW = Math.min(bw - cropX, Math.ceil(face.bbox.width * bw));
      const cropH = Math.min(bh - cropY, Math.ceil(face.bbox.height * bh));

      if (cropW <= 0 || cropH <= 0) continue;

      canvas.width = cropW;
      canvas.height = cropH;
      ctx.drawImage(
        frame.bitmap,
        cropX,
        cropY,
        cropW,
        cropH,
        0,
        0,
        cropW,
        cropH,
      );

      const cropBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) =>
            b ? resolve(b) : reject(new PipelineError("Failed to crop face.")),
          "image/jpeg",
          0.9,
        );
      });

      const encrypted = await encryptFace(cropBlob);

      lockedFaces.push({
        frameIndex: face.frameIndex,
        bbox: face.bbox,
        ...encrypted,
      });

      report(
        "encrypt",
        (i + 1) / detectionResult.faces.length,
        `Encrypting face ${i + 1}/${detectionResult.faces.length}`,
      );
    }
  }

  // Step 5: Hash original file + blurred frames
  report("hash", 0, "Computing integrity hashes...");
  const originalSha256 = await sha256File(file);
  report("hash", 0.5, "Hashing blurred frames...");

  const processedFrames: ProcessedFrame[] = [];
  for (let i = 0; i < blurredFrames.length; i++) {
    const blurred = blurredFrames[i];
    const frameHash = await sha256(blurred.blob);
    const base64 = _arrayBufferToBase64(await blurred.blob.arrayBuffer());

    processedFrames.push({
      frameIndex: blurred.frameIndex,
      tSeconds: blurred.tSeconds,
      blurredJpegBase64: base64,
      sha256: frameHash,
    });

    report(
      "hash",
      0.5 + (0.5 * (i + 1)) / blurredFrames.length,
      `Hashed frame ${i + 1}/${blurredFrames.length}`,
    );
  }

  // Done
  report(
    "done",
    1,
    `${lockedFaces.length} faces locked, 0 stored in the clear`,
  );

  // Release bitmaps
  for (const frame of extracted.frames) {
    frame.bitmap.close();
  }

  return {
    filename: file.name,
    capturedAt: new Date().toISOString(),
    durationSeconds: extracted.durationSeconds,
    originalSha256,
    frames: processedFrames,
    faces: lockedFaces,
  };
}
