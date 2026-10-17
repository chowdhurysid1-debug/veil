import { describe, expect, it } from "vitest";
import { PipelineError } from "./processClip";

describe("PipelineError", () => {
  it("has the correct name", () => {
    const err = new PipelineError("test");
    expect(err.name).toBe("PipelineError");
    expect(err.message).toBe("test");
    expect(err).toBeInstanceOf(Error);
  });
});

describe("processClip validation", () => {
  it("rejects files over 500 MB", async () => {
    // Dynamically import to avoid the mediapipe resolution at module level
    const { processClip } = await import("./processClip");

    // Create a fake file larger than 500 MB
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
});
