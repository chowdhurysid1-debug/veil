// Shared fixtures for handler tests: in-memory deps and a valid upload body.
import { randomBytes, randomUUID } from "node:crypto";

import type { CreateClipRequest } from "../contracts";
import { SEED_SITES } from "../learning/seed";
import { sha256Hex } from "./bytes";
import type { VeilDeps } from "./deps";
import { createMemoryBlobStore, createMemoryStore } from "./memoryStore";

export const TEST_NOW = new Date("2026-10-16T21:04:00.000Z");
export const DEMO_SITE_ID = SEED_SITES[0].id;

export function makeDeps(overrides: Partial<VeilDeps> = {}) {
  const store = createMemoryStore();
  const blobs = createMemoryBlobStore();
  const deps: VeilDeps = {
    store,
    blobs,
    signingSecret: "s".repeat(40),
    vaultSecret: "v".repeat(40),
    now: () => TEST_NOW,
    newId: () => randomUUID(),
    ...overrides,
  };
  return { deps, store, blobs };
}

export function fakeJpeg(seed: number): Uint8Array {
  return new Uint8Array([0xff, 0xd8, 0xff, 0xe0, seed, ...randomBytes(32)]);
}

export function makeUpload(
  options: { frames?: number; facesPerFrame?: number } = {},
): CreateClipRequest {
  const frameCount = options.frames ?? 3;
  const facesPerFrame = options.facesPerFrame ?? 1;

  const frames = Array.from({ length: frameCount }, (_, frameIndex) => {
    const bytes = fakeJpeg(frameIndex);
    return {
      frameIndex,
      tSeconds: frameIndex,
      blurredJpegBase64: Buffer.from(bytes).toString("base64"),
      sha256: sha256Hex(bytes),
    };
  });

  const faces = frames.flatMap(({ frameIndex }) =>
    Array.from({ length: facesPerFrame }, () => ({
      frameIndex,
      bbox: { x: 0.4, y: 0.2, width: 0.1, height: 0.15 },
      ciphertextBase64: randomBytes(64).toString("base64"),
      ivBase64: randomBytes(12).toString("base64"),
      rawKeyBase64: randomBytes(32).toString("base64"),
    })),
  );

  return {
    siteId: DEMO_SITE_ID,
    filename: "hallway-b-1404.mp4",
    capturedAt: "2026-10-16T21:03:30.000Z",
    durationSeconds: 24,
    originalSha256: sha256Hex(new TextEncoder().encode("original video")),
    frames,
    faces,
  };
}

export function jsonRequest(
  body: unknown,
  { method = "POST", raw }: { method?: string; raw?: string } = {},
): Request {
  return new Request("http://localhost/api/test", {
    method,
    headers: { "content-type": "application/json" },
    body: raw ?? JSON.stringify(body),
  });
}

export async function readBody(response: Response): Promise<unknown> {
  return response.json();
}
