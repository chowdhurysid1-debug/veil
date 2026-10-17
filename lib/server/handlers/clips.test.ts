import { describe, expect, it, vi } from "vitest";

import {
  apiErrorSchema,
  clipDetailSchema,
  clipSummarySchema,
  createClipResponseSchema,
  videoUploadResponseSchema,
} from "../../contracts";
import { runHandler } from "../deps";
import { ConfigError } from "../env";
import { MAX_CLIP_REQUEST_BYTES } from "../http";
import { seedMemoryStore } from "../memoryStore";
import { isStampValid } from "../signing";
import {
  jsonRequest,
  makeDeps,
  makeUpload,
  readBody,
  TEST_NOW,
  uploadClip,
} from "../testDeps";
import { unwrapKey } from "../vault";
import {
  createClip,
  createVideoUpload,
  getClipDetail,
  listClips,
  VIDEO_UPLOAD_WINDOW_MS,
} from "./clips";

async function errorOf(response: Response) {
  return apiErrorSchema.parse(await readBody(response)).error;
}

describe("POST /api/clips", () => {
  it("stores frames and locked faces and returns a signed stamp", async () => {
    const { deps, store, blobs } = makeDeps();
    const upload = makeUpload({ frames: 3, facesPerFrame: 2 });

    const response = await createClip(jsonRequest(upload), deps);

    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = createClipResponseSchema.parse(await readBody(response));
    expect(body).toMatchObject({
      facesLocked: 6,
      framesStored: 3,
      stampedAt: TEST_NOW.toISOString(),
    });
    expect(
      isStampValid(
        deps.signingSecret,
        {
          clipId: body.clipId,
          sha256: upload.originalSha256,
          capturedAt: upload.capturedAt,
          stampedAt: body.stampedAt,
        },
        body.signature,
      ),
    ).toBe(true);

    expect(store.state.clips).toHaveLength(1);
    expect(store.state.frames).toHaveLength(3);
    expect(store.state.faces).toHaveLength(6);
    expect(blobs.objects.size).toBe(9);

    const frameObject = blobs.objects.get(`frames/${body.clipId}/00.jpg`);
    expect(frameObject?.contentType).toBe("image/jpeg");
    expect(Buffer.from(frameObject?.bytes ?? []).toString("base64")).toBe(
      upload.frames[0].blurredJpegBase64,
    );
  });

  it("never stores a raw face key, only a wrapped one that opens with the vault secret", async () => {
    const { deps, store } = makeDeps();
    const upload = makeUpload({ frames: 1, facesPerFrame: 1 });

    await createClip(jsonRequest(upload), deps);

    const rawKey = upload.faces[0].rawKeyBase64;
    expect(JSON.stringify(store.state)).not.toContain(rawKey);
    expect(unwrapKey(deps.vaultSecret, store.state.faces[0].wrappedKey)).toBe(
      rawKey,
    );
  });

  it("accepts a clip with no faces", async () => {
    const { deps } = makeDeps();
    const response = await createClip(
      jsonRequest(makeUpload({ facesPerFrame: 0 })),
      deps,
    );
    expect(response.status).toBe(201);
  });

  it("rejects a body that is not JSON", async () => {
    const { deps } = makeDeps();
    const response = await createClip(
      jsonRequest(null, { raw: "{nope" }),
      deps,
    );
    expect(response.status).toBe(400);
    expect(await errorOf(response)).toBe("Send a JSON request body.");
  });

  it("rejects a body that does not match the contract", async () => {
    const { deps, store } = makeDeps();
    const response = await createClip(
      jsonRequest({ ...makeUpload(), originalSha256: "not-a-hash" }),
      deps,
    );
    expect(response.status).toBe(400);
    expect(await errorOf(response)).toMatch(/originalSha256/);
    expect(store.state.clips).toHaveLength(0);
  });

  it("rejects a frame whose bytes do not match its hash", async () => {
    const { deps, blobs } = makeDeps();
    const upload = makeUpload();
    upload.frames[1].sha256 = "f".repeat(64);
    const response = await createClip(jsonRequest(upload), deps);
    expect(response.status).toBe(400);
    expect(await errorOf(response)).toBe(
      "Frame 1 does not match its SHA-256 hash.",
    );
    expect(blobs.objects.size).toBe(0);
  });

  it("rejects a frame that is not a JPEG", async () => {
    const { deps } = makeDeps();
    const upload = makeUpload();
    upload.frames[0].blurredJpegBase64 = Buffer.from("PNG!").toString("base64");
    const response = await createClip(jsonRequest(upload), deps);
    expect(response.status).toBe(400);
    expect(await errorOf(response)).toBe("Frame 0 is not a JPEG image.");
  });

  it("rejects a face that points at a frame that was not uploaded", async () => {
    const { deps } = makeDeps();
    const upload = makeUpload({ frames: 2 });
    upload.faces[0].frameIndex = 7;
    const response = await createClip(jsonRequest(upload), deps);
    expect(response.status).toBe(400);
    expect(await errorOf(response)).toMatch(/frame 7/);
  });

  it("rejects a face key that is not 256 bits", async () => {
    const { deps } = makeDeps();
    const upload = makeUpload({ frames: 1 });
    upload.faces[0].rawKeyBase64 = Buffer.alloc(16).toString("base64");
    const response = await createClip(jsonRequest(upload), deps);
    expect(response.status).toBe(400);
    expect(await errorOf(response)).toMatch(/256-bit/);
  });

  it("returns 404 for an unknown site", async () => {
    const { deps } = makeDeps();
    const response = await createClip(
      jsonRequest({
        ...makeUpload(),
        siteId: "0b5c7d1e-2f3a-4b5c-8d6e-7f8a9b0c1d2e",
      }),
      deps,
    );
    expect(response.status).toBe(404);
  });

  it("rejects an oversized body by its declared length", async () => {
    const { deps } = makeDeps();
    const request = new Request("http://localhost/api/clips", {
      method: "POST",
      headers: { "content-length": String(MAX_CLIP_REQUEST_BYTES + 1) },
      body: "{}",
    });
    const response = await createClip(request, deps);
    expect(response.status).toBe(413);
    expect(await errorOf(response)).toMatch(/too large/);
  });

  it("rejects an oversized body that does not declare its length", async () => {
    const { deps } = makeDeps();
    const raw = JSON.stringify({ padding: "a".repeat(MAX_CLIP_REQUEST_BYTES) });
    const response = await createClip(jsonRequest(null, { raw }), deps);
    expect(response.status).toBe(413);
  });

  it("removes uploaded objects when the database write fails", async () => {
    const { deps, store, blobs } = makeDeps();
    store.createClip = vi.fn(async () => {
      throw new Error("connection reset");
    });

    await expect(createClip(jsonRequest(makeUpload()), deps)).rejects.toThrow(
      "connection reset",
    );
    expect(blobs.objects.size).toBe(0);
  });
});

describe("GET /api/clips", () => {
  it("lists uploaded clips newest first and hides seed clips", async () => {
    const { deps, store } = makeDeps();
    seedMemoryStore(store, TEST_NOW);
    let tick = 0;
    deps.now = () => new Date(TEST_NOW.getTime() + tick++ * 60_000);

    await createClip(jsonRequest(makeUpload({ facesPerFrame: 2 })), deps);
    await createClip(
      jsonRequest({ ...makeUpload({ facesPerFrame: 1 }), filename: "b.mp4" }),
      deps,
    );

    const body = clipSummarySchema
      .array()
      .parse(await readBody(await listClips(deps)));
    expect(body.map((clip) => clip.filename)).toEqual([
      "b.mp4",
      "hallway-b-1404.mp4",
    ]);
    expect(body[1]).toMatchObject({
      siteName: "Demo High School",
      facesLocked: 6,
      eventsFlagged: 0,
    });
  });
});

describe("blurred video", () => {
  function videoRequest(token: string) {
    return jsonRequest({ token });
  }

  it("has no video until the uploading browser adds one, then signs a URL for it", async () => {
    const { deps, blobs } = makeDeps();
    const { clipId, videoUploadToken } = await uploadClip(deps);

    const before = clipDetailSchema.parse(
      await readBody(await getClipDetail(clipId, deps)),
    );
    expect(before.videoUrl).toBeNull();

    const upload = await createVideoUpload(
      videoRequest(videoUploadToken),
      clipId,
      deps,
    );
    expect(upload.status).toBe(201);
    const { uploadUrl } = videoUploadResponseSchema.parse(
      await readBody(upload),
    );
    expect(uploadUrl).toContain(`videos/${clipId}.mp4`);

    await blobs.upload(
      "videos",
      `${clipId}.mp4`,
      new Uint8Array([0, 0, 0, 24]),
      "video/mp4",
    );
    const after = clipDetailSchema.parse(
      await readBody(await getClipDetail(clipId, deps)),
    );
    expect(after.videoUrl).toContain(`videos/${clipId}.mp4`);
  });

  it("still shows the clip with stills when the video lookup fails", async () => {
    const { deps, blobs } = makeDeps();
    const { clipId } = await uploadClip(deps);
    blobs.signedUrlIfExists = async () => {
      throw new Error("Bucket not found");
    };
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const response = await getClipDetail(clipId, deps);
    expect(response.status).toBe(200);
    expect(
      clipDetailSchema.parse(await readBody(response)).videoUrl,
    ).toBeNull();
    expect(consoleError).toHaveBeenCalledOnce();
    consoleError.mockRestore();
  });

  it("refuses anyone without the token from the clip upload", async () => {
    const { deps } = makeDeps();
    const { clipId } = await uploadClip(deps);
    const other = await uploadClip(deps);

    for (const token of ["", "f".repeat(64), other.videoUploadToken]) {
      const response = await createVideoUpload(
        videoRequest(token),
        clipId,
        deps,
      );
      expect(response.status).toBe(403);
    }
  });

  it("refuses a second video for the same clip", async () => {
    const { deps, blobs } = makeDeps();
    const { clipId, videoUploadToken } = await uploadClip(deps);
    await blobs.upload(
      "videos",
      `${clipId}.mp4`,
      new Uint8Array([1]),
      "video/mp4",
    );

    const response = await createVideoUpload(
      videoRequest(videoUploadToken),
      clipId,
      deps,
    );
    expect(response.status).toBe(409);
    expect(await errorOf(response)).toBe(
      "This clip already has its blurred video.",
    );
  });

  it("refuses a video for a clip stamped long ago", async () => {
    const { deps } = makeDeps();
    const { clipId, videoUploadToken } = await uploadClip(deps);
    deps.now = () =>
      new Date(TEST_NOW.getTime() + VIDEO_UPLOAD_WINDOW_MS + 1000);

    const response = await createVideoUpload(
      videoRequest(videoUploadToken),
      clipId,
      deps,
    );
    expect(response.status).toBe(409);
  });

  it("answers 404 for a clip that does not exist", async () => {
    const { deps } = makeDeps();
    const response = await createVideoUpload(
      videoRequest("f".repeat(64)),
      "not-a-uuid",
      deps,
    );
    expect(response.status).toBe(404);
  });
});

describe("runHandler", () => {
  it("turns missing configuration into a friendly 503", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await runHandler("test", listClips, () => {
      throw new ConfigError("Missing server environment variables: X");
    });
    expect(response.status).toBe(503);
    expect(await errorOf(response)).toMatch(/not connected yet/);
  });

  it("turns an unexpected crash into a friendly 500 without the raw message", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { deps } = makeDeps();
    const response = await runHandler(
      "test",
      async () => {
        throw new Error("relation public.clips does not exist");
      },
      () => deps,
    );
    expect(response.status).toBe(500);
    expect(await errorOf(response)).not.toMatch(/relation/);
  });
});
