import { describe, expect, it } from "vitest";
import { PipelineError } from "./processClip";
import { processedClipSchema } from "@/lib/contracts";

describe("PipelineError", () => {
  it("has the correct name", () => {
    const err = new PipelineError("test");
    expect(err.name).toBe("PipelineError");
    expect(err.message).toBe("test");
    expect(err).toBeInstanceOf(Error);
  });
});

describe("processClip validation (hardening)", () => {
  it("rejects files over 500 MB", async () => {
    const { processClip } = await import("./processClip");

    const hugeFile = new File(["x"], "huge.mp4", { type: "video/mp4" });
    Object.defineProperty(hugeFile, "size", { value: 600 * 1024 * 1024 });

    await expect(processClip(hugeFile)).rejects.toThrow(PipelineError);
    await expect(processClip(hugeFile)).rejects.toThrow("too large");
  });

  it("rejects non-video files", async () => {
    const { processClip } = await import("./processClip");

    const textFile = new File(["hello"], "readme.txt", {
      type: "text/plain",
    });

    await expect(processClip(textFile)).rejects.toThrow(PipelineError);
    await expect(processClip(textFile)).rejects.toThrow(
      "not appear to be a video",
    );
  });

  it("rejects files with empty MIME type", async () => {
    const { processClip } = await import("./processClip");

    const noTypeFile = new File(["data"], "mystery.bin", { type: "" });

    await expect(processClip(noTypeFile)).rejects.toThrow(PipelineError);
    await expect(processClip(noTypeFile)).rejects.toThrow(
      "not appear to be a video",
    );
  });

  it("accepts a borderline 500 MB video file (does not reject)", async () => {
    const { processClip } = await import("./processClip");

    const borderline = new File(["x"], "ok.mp4", { type: "video/mp4" });
    Object.defineProperty(borderline, "size", { value: 500 * 1024 * 1024 });

    // Will fail at extractFrames (no real video), but should not fail at size validation
    await expect(processClip(borderline)).rejects.toThrow("codec");
  });

  it("accepts zero-face clips (faces array is empty, not an error)", () => {
    // Zero-face clips are valid: the pipeline produces blurred frames
    // and hashes, just with an empty faces array.
    const hash = "a".repeat(64);
    const clip = {
      filename: "no-faces.mp4",
      capturedAt: new Date().toISOString(),
      durationSeconds: 10,
      originalSha256: hash,
      frames: [
        {
          frameIndex: 0,
          tSeconds: 0,
          blurredJpegBase64: "eA==",
          sha256: hash,
        },
      ],
      faces: [], // zero faces is valid
    };
    expect(processedClipSchema.safeParse(clip).success).toBe(true);
  });
});
