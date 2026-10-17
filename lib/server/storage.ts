export const FRAMES_BUCKET = "frames";
export const VAULT_BUCKET = "vault";
export type Bucket = typeof FRAMES_BUCKET | typeof VAULT_BUCKET;

export const FRAME_URL_TTL_SECONDS = 600;
export const FACE_URL_TTL_SECONDS = 30;

export const JPEG_CONTENT_TYPE = "image/jpeg";
export const CIPHERTEXT_CONTENT_TYPE = "application/octet-stream";

export function framePath(clipId: string, frameIndex: number): string {
  return `${clipId}/${String(frameIndex).padStart(2, "0")}.jpg`;
}

export function vaultPath(clipId: string, faceId: string): string {
  return `${clipId}/${faceId}.bin`;
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
  };
}

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
