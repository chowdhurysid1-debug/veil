import { describe, expect, it, vi, beforeEach } from "vitest";
import { detectFaces, resetDetector } from "./detectFaces";
import type { ExtractedFrame } from "./extractFrames";
import { boundingBoxSchema } from "@/lib/contracts";

// Mock mediapipe import
vi.mock("@mediapipe/tasks-vision", () => {
  const mockDetector = {
    detect: vi.fn().mockReturnValue({
      detections: [
        {
          boundingBox: { originX: 100, originY: 50, width: 80, height: 100 },
          categories: [{ score: 0.95 }],
          keypoints: [],
        },
      ],
    }),
  };
  const mockPersonDetector = {
    detect: vi.fn().mockReturnValue({ detections: [] }),
  };
  return {
    FilesetResolver: {
      forVisionTasks: vi.fn().mockResolvedValue({}),
    },
    FaceDetector: {
      createFromOptions: vi.fn().mockResolvedValue(mockDetector),
    },
    ObjectDetector: {
      createFromOptions: vi.fn().mockResolvedValue(mockPersonDetector),
    },
  };
});

function makeFakeFrame(frameIndex: number): ExtractedFrame {
  return {
    frameIndex,
    tSeconds: frameIndex,
    blob: new Blob(["fake"], { type: "image/jpeg" }),
    bitmap: {
      width: 640,
      height: 480,
      close: vi.fn(),
    } as unknown as ImageBitmap,
  };
}

beforeEach(() => {
  resetDetector();
});

describe("detectFaces", () => {
  it("returns normalized bounding boxes", async () => {
    const frames = [makeFakeFrame(0)];
    const result = await detectFaces(frames);

    expect(result.totalFaces).toBe(1);
    expect(result.faces).toHaveLength(1);

    const face = result.faces[0];
    expect(face.frameIndex).toBe(0);

    // 100/640 = 0.15625, 50/480 = 0.10416..., 80/640 = 0.125, 100/480 = 0.20833...
    expect(face.bbox.x).toBeCloseTo(0.15625, 4);
    expect(face.bbox.y).toBeCloseTo(0.10417, 4);
    expect(face.bbox.width).toBeCloseTo(0.125, 4);
    expect(face.bbox.height).toBeCloseTo(0.20833, 4);
  });

  it("normalized boxes pass the contract schema", async () => {
    const frames = [makeFakeFrame(0)];
    const result = await detectFaces(frames);
    for (const face of result.faces) {
      expect(boundingBoxSchema.safeParse(face.bbox).success).toBe(true);
    }
  });

  it("calls onProgress for each frame", async () => {
    const frames = [makeFakeFrame(0), makeFakeFrame(1), makeFakeFrame(2)];
    const progress: [number, number][] = [];
    await detectFaces(frames, (done, total) => progress.push([done, total]));
    expect(progress).toEqual([
      [1, 3],
      [2, 3],
      [3, 3],
    ]);
  });

  it("throws when model fails to load (fail closed)", async () => {
    const { FilesetResolver } = await import("@mediapipe/tasks-vision");
    (
      FilesetResolver as unknown as {
        forVisionTasks: ReturnType<typeof vi.fn>;
      }
    ).forVisionTasks.mockRejectedValueOnce(new Error("network error"));

    const frames = [makeFakeFrame(0)];
    await expect(detectFaces(frames)).rejects.toThrow(
      "Face detection model failed to load",
    );
  });

  it("handles frames with no faces", async () => {
    const { FaceDetector } = await import("@mediapipe/tasks-vision");
    const mockDetector = await (
      FaceDetector as unknown as {
        createFromOptions: () => Promise<{ detect: ReturnType<typeof vi.fn> }>;
      }
    ).createFromOptions();
    mockDetector.detect.mockReturnValueOnce({ detections: [] });

    const frames = [makeFakeFrame(0)];
    const result = await detectFaces(frames);
    expect(result.totalFaces).toBe(0);
    expect(result.faces).toHaveLength(0);
  });

  // Real hallway footage: the face model found nobody, but people were walking past.
  it("locks the head of a person whose face the face model misses", async () => {
    const { FaceDetector, ObjectDetector } =
      await import("@mediapipe/tasks-vision");
    type MockFactory = {
      createFromOptions: () => Promise<{ detect: ReturnType<typeof vi.fn> }>;
    };
    const faceModel = await (
      FaceDetector as unknown as MockFactory
    ).createFromOptions();
    const personModel = await (
      ObjectDetector as unknown as MockFactory
    ).createFromOptions();
    faceModel.detect.mockReturnValueOnce({ detections: [] });
    personModel.detect.mockReturnValueOnce({
      detections: [
        { boundingBox: { originX: 320, originY: 96, width: 80, height: 300 } },
      ],
    });

    const result = await detectFaces([makeFakeFrame(0)]);

    expect(result.totalFaces).toBe(1);
    const head = result.faces[0].bbox;
    // Top-centre of the person: x 0.5..0.625 of 640 wide, starting at y 0.2.
    expect(head.y).toBeCloseTo(96 / 480, 4);
    expect(head.x).toBeGreaterThanOrEqual(320 / 640);
    expect(head.x + head.width).toBeLessThanOrEqual(400 / 640);
  });
});
