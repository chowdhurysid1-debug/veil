import { describe, expect, it, vi } from "vitest";

import {
  createSupabaseBlobStore,
  FRAMES_BUCKET,
  framePath,
  mapWithConcurrency,
  StorageError,
  VAULT_BUCKET,
  vaultPath,
  VIDEOS_BUCKET,
  videoPath,
  type StorageApi,
} from "./storage";

type BucketApi = ReturnType<StorageApi["from"]>;

function fakeStorage(overrides: Partial<BucketApi> = {}) {
  const bucket: BucketApi = {
    upload: vi.fn(async () => ({ error: null })),
    download: vi.fn(async () => ({
      data: new Blob([new Uint8Array([1, 2, 3])]),
      error: null,
    })),
    createSignedUrls: vi.fn(async (paths: string[]) => ({
      data: [...paths].reverse().map((path) => ({
        path,
        signedUrl: `https://signed.test/${path}`,
        error: null,
      })),
      error: null,
    })),
    remove: vi.fn(async () => ({ error: null })),
    createSignedUploadUrl: vi.fn(async (path: string) => ({
      data: { signedUrl: `https://signed.test/upload/${path}?token=t` },
      error: null,
    })),
    createSignedUrl: vi.fn(async (path: string) => ({
      data: { signedUrl: `https://signed.test/${path}` },
      error: null,
    })),
    ...overrides,
  };
  const from = vi.fn(() => bucket);
  return { storage: { from } satisfies StorageApi, bucket, from };
}

describe("storage paths", () => {
  it("builds frame and vault paths under the clip id", () => {
    expect(framePath("clip-1", 3)).toBe("clip-1/03.jpg");
    expect(vaultPath("clip-1", "face-9")).toBe("clip-1/face-9.bin");
  });
});

describe("createSupabaseBlobStore", () => {
  it("uploads without overwriting existing objects", async () => {
    const { storage, bucket, from } = fakeStorage();
    const bytes = new Uint8Array([9]);
    await createSupabaseBlobStore(storage).upload(
      FRAMES_BUCKET,
      "c/00.jpg",
      bytes,
      "image/jpeg",
    );
    expect(from).toHaveBeenCalledWith("frames");
    expect(bucket.upload).toHaveBeenCalledWith("c/00.jpg", bytes, {
      contentType: "image/jpeg",
      upsert: false,
    });
  });

  it("throws a StorageError when an upload fails", async () => {
    const { storage } = fakeStorage({
      upload: async () => ({ error: { message: "bucket not found" } }),
    });
    await expect(
      createSupabaseBlobStore(storage).upload(
        VAULT_BUCKET,
        "c/f.bin",
        new Uint8Array([1]),
        "application/octet-stream",
      ),
    ).rejects.toThrow(StorageError);
  });

  it("downloads bytes", async () => {
    const { storage } = fakeStorage();
    const bytes = await createSupabaseBlobStore(storage).download(
      FRAMES_BUCKET,
      "c/00.jpg",
    );
    expect(Array.from(bytes)).toEqual([1, 2, 3]);
  });

  it("returns signed URLs in the order the paths were given", async () => {
    const { storage, bucket } = fakeStorage();
    const urls = await createSupabaseBlobStore(storage).signedUrls(
      FRAMES_BUCKET,
      ["c/00.jpg", "c/01.jpg"],
      600,
    );
    expect(urls).toEqual([
      "https://signed.test/c/00.jpg",
      "https://signed.test/c/01.jpg",
    ]);
    expect(bucket.createSignedUrls).toHaveBeenCalledWith(
      ["c/00.jpg", "c/01.jpg"],
      600,
    );
  });

  it("skips the network for an empty path list", async () => {
    const { storage, bucket } = fakeStorage();
    expect(
      await createSupabaseBlobStore(storage).signedUrls(FRAMES_BUCKET, [], 60),
    ).toEqual([]);
    expect(bucket.createSignedUrls).not.toHaveBeenCalled();
  });

  it("throws when any single path fails to sign", async () => {
    const { storage } = fakeStorage({
      createSignedUrls: async (paths: string[]) => ({
        data: paths.map((path, index) => ({
          path,
          signedUrl: index === 1 ? null : `https://signed.test/${path}`,
          error: index === 1 ? "Object not found" : null,
        })),
        error: null,
      }),
    });
    await expect(
      createSupabaseBlobStore(storage).signedUrls(
        VAULT_BUCKET,
        ["a.bin", "b.bin"],
        30,
      ),
    ).rejects.toThrow(/b\.bin failed: Object not found/);
  });

  it("signs a one-time video upload that cannot overwrite", async () => {
    const { storage, bucket, from } = fakeStorage();
    const url = await createSupabaseBlobStore(storage).signedUploadUrl(
      VIDEOS_BUCKET,
      videoPath("clip-1"),
    );
    expect(from).toHaveBeenCalledWith("videos");
    expect(bucket.createSignedUploadUrl).toHaveBeenCalledWith("clip-1.mp4", {
      upsert: false,
    });
    expect(url).toBe("https://signed.test/upload/clip-1.mp4?token=t");
  });

  it("returns null for a clip with no blurred video", async () => {
    const { storage } = fakeStorage({
      createSignedUrl: async () => ({
        data: null,
        error: { message: "Object not found" },
      }),
    });
    await expect(
      createSupabaseBlobStore(storage).signedUrlIfExists(
        VIDEOS_BUCKET,
        "clip-1.mp4",
        600,
      ),
    ).resolves.toBeNull();
  });

  it("still throws when signing fails for any other reason", async () => {
    const { storage } = fakeStorage({
      createSignedUrl: async () => ({
        data: null,
        error: { message: "Bucket not found" },
      }),
    });
    await expect(
      createSupabaseBlobStore(storage).signedUrlIfExists(
        VIDEOS_BUCKET,
        "clip-1.mp4",
        600,
      ),
    ).rejects.toThrow(StorageError);
  });
});

describe("mapWithConcurrency", () => {
  it("keeps result order and never exceeds the limit", async () => {
    let inFlight = 0;
    let peak = 0;
    const results = await mapWithConcurrency(
      [5, 1, 4, 2, 3],
      2,
      async (value) => {
        inFlight += 1;
        peak = Math.max(peak, inFlight);
        await new Promise((resolve) => setTimeout(resolve, value));
        inFlight -= 1;
        return value * 10;
      },
    );
    expect(results).toEqual([50, 10, 40, 20, 30]);
    expect(peak).toBeLessThanOrEqual(2);
  });

  it("handles an empty list", async () => {
    expect(await mapWithConcurrency([], 4, async () => 1)).toEqual([]);
  });
});
