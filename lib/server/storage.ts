export const FRAMES_BUCKET = "frames";
export const VAULT_BUCKET = "vault";
export const VIDEOS_BUCKET = "videos";
export type Bucket =
  typeof FRAMES_BUCKET | typeof VAULT_BUCKET | typeof VIDEOS_BUCKET;

export const FRAME_URL_TTL_SECONDS = 600;
export const FACE_URL_TTL_SECONDS = 30;
export const VIDEO_URL_TTL_SECONDS = 600;

export const JPEG_CONTENT_TYPE = "image/jpeg";
export const CIPHERTEXT_CONTENT_TYPE = "application/octet-stream";

export function framePath(clipId: string, frameIndex: number): string {
  return `${clipId}/${String(frameIndex).padStart(2, "0")}.jpg`;
}

export function vaultPath(clipId: string, faceId: string): string {
  return `${clipId}/${faceId}.bin`;
}

// One blurred video per clip, so the path alone says whether a clip has one.
export function videoPath(clipId: string): string {
  return `${clipId}.mp4`;
}

export interface BlobStore {
  upload(
    bucket: Bucket,
    path: string,
    bytes: Uint8Array,
    contentType: string,
  ): Promise<void>;
  download(bucket: Bucket, path: string): Promise<Uint8Array>;
  // Same order as `paths`.
  signedUrls(
    bucket: Bucket,
    paths: string[],
    expiresInSeconds: number,
  ): Promise<string[]>;
  remove(bucket: Bucket, paths: string[]): Promise<void>;
  // A one-time URL the browser can PUT one new object to. It cannot overwrite.
  signedUploadUrl(bucket: Bucket, path: string): Promise<string>;
  // Null when the object does not exist.
  signedUrlIfExists(
    bucket: Bucket,
    path: string,
    expiresInSeconds: number,
  ): Promise<string | null>;
}

export class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageError";
  }
}

interface ApiError {
  message: string;
}

// The slice of `supabase.storage` used here, so tests can pass a fake.
export interface StorageApi {
  from(bucket: string): {
    upload(
      path: string,
      body: Uint8Array,
      options: { contentType: string; upsert: boolean },
    ): PromiseLike<{ error: ApiError | null }>;
    download(
      path: string,
    ): PromiseLike<{ data: Blob | null; error: ApiError | null }>;
    createSignedUrls(
      paths: string[],
      expiresIn: number,
    ): PromiseLike<{
      data: Array<{
        path: string | null;
        signedUrl: string | null;
        error: string | null;
      }> | null;
      error: ApiError | null;
    }>;
    remove(paths: string[]): PromiseLike<{ error: ApiError | null }>;
    createSignedUploadUrl(
      path: string,
      options: { upsert: boolean },
    ): PromiseLike<{
      data: { signedUrl: string } | null;
      error: ApiError | null;
    }>;
    createSignedUrl(
      path: string,
      expiresIn: number,
    ): PromiseLike<{
      data: { signedUrl: string } | null;
      error: ApiError | null;
    }>;
  };
}

// Only a missing object means "no video yet". A missing bucket is a setup error.
const OBJECT_NOT_FOUND = /^object not found/i;

export function createSupabaseBlobStore(storage: StorageApi): BlobStore {
  return {
    async upload(bucket, path, bytes, contentType) {
      const { error } = await storage
        .from(bucket)
        .upload(path, bytes, { contentType, upsert: false });
      if (error) {
        throw new StorageError(
          `Upload to ${bucket}/${path} failed: ${error.message}`,
        );
      }
    },

    async download(bucket, path) {
      const { data, error } = await storage.from(bucket).download(path);
      if (error || !data) {
        throw new StorageError(
          `Download of ${bucket}/${path} failed: ${error?.message ?? "no data"}`,
        );
      }
      return new Uint8Array(await data.arrayBuffer());
    },

    async signedUrls(bucket, paths, expiresInSeconds) {
      if (paths.length === 0) return [];
      const { data, error } = await storage
        .from(bucket)
        .createSignedUrls(paths, expiresInSeconds);
      if (error || !data) {
        throw new StorageError(
          `Signing ${paths.length} ${bucket} URLs failed: ${error?.message ?? "no data"}`,
        );
      }

      const byPath = new Map(data.map((item) => [item.path, item] as const));
      return paths.map((path) => {
        const item = byPath.get(path);
        if (!item?.signedUrl) {
          throw new StorageError(
            `Signing ${bucket}/${path} failed: ${item?.error ?? "missing from response"}`,
          );
        }
        return item.signedUrl;
      });
    },

    async remove(bucket, paths) {
      if (paths.length === 0) return;
      const { error } = await storage.from(bucket).remove(paths);
      if (error) {
        throw new StorageError(
          `Removing ${paths.length} objects from ${bucket} failed: ${error.message}`,
        );
      }
    },

    async signedUploadUrl(bucket, path) {
      const { data, error } = await storage
        .from(bucket)
        .createSignedUploadUrl(path, { upsert: false });
      if (error || !data) {
        throw new StorageError(
          `Signing an upload to ${bucket}/${path} failed: ${error?.message ?? "no data"}`,
        );
      }
      return data.signedUrl;
    },

    async signedUrlIfExists(bucket, path, expiresInSeconds) {
      const { data, error } = await storage
        .from(bucket)
        .createSignedUrl(path, expiresInSeconds);
      if (error && OBJECT_NOT_FOUND.test(error.message)) return null;
      if (error || !data) {
        throw new StorageError(
          `Signing ${bucket}/${path} failed: ${error?.message ?? "no data"}`,
        );
      }
      return data.signedUrl;
    },
  };
}

// Runs `task` over `items` with at most `limit` in flight, keeping result order.
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  task: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await task(items[index], index);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () =>
    worker(),
  );
  await Promise.all(workers);
  return results;
}
