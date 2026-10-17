import { randomBytes } from "node:crypto";

import { describe, expect, it } from "vitest";

import { verifyResponseSchema } from "../../contracts";
import { sha256Hex } from "../bytes";
import {
  jsonRequest,
  makeDeps,
  makeUpload,
  readBody,
  TEST_NOW,
  uploadClip,
} from "../testDeps";
import { verifyClip } from "./verify";

// Stands in for the original video file the officer drops on the Verify page.
const originalFile = new Uint8Array(randomBytes(4096));

async function setup() {
  const made = makeDeps();
  const upload = { ...makeUpload(), originalSha256: sha256Hex(originalFile) };
  const { clipId } = await uploadClip(made.deps, upload);
  return { ...made, clipId };
}

async function verify(
  clipId: string,
  sha256: string,
  deps: ReturnType<typeof makeDeps>["deps"],
) {
  const response = await verifyClip(jsonRequest({ sha256 }), clipId, deps);
  expect(response.status).toBe(200);
  return verifyResponseSchema.parse(await readBody(response));
}

describe("POST /api/clips/:id/verify", () => {
  it("reports intact for the exact file that was stamped", async () => {
    const { deps, clipId } = await setup();

    const result = await verify(clipId, sha256Hex(originalFile), deps);

    expect(result).toEqual({
      clipId,
      status: "intact",
      stampedAt: TEST_NOW.toISOString(),
      stampedSha256Prefix: sha256Hex(originalFile).slice(0, 12),
    });
  });

  it("reports tampered when one byte of the file changed", async () => {
    const { deps, clipId } = await setup();
    const edited = new Uint8Array(originalFile);
    edited[2048] ^= 0x01;

    const result = await verify(clipId, sha256Hex(edited), deps);

    expect(result.status).toBe("tampered");
    expect(result.stampedAt).toBe(TEST_NOW.toISOString());
  });

  it("reports tampered when someone rewrites the stored hash to match an edited file", async () => {
    const { deps, store, clipId } = await setup();
    const edited = new Uint8Array(originalFile);
    edited[0] ^= 0xff;
    store.state.clips[0].sha256 = sha256Hex(edited);

    const result = await verify(clipId, sha256Hex(edited), deps);

    expect(result.status).toBe("tampered");
  });

  it("reports tampered when the stamp time was moved", async () => {
    const { deps, store, clipId } = await setup();
    store.state.clips[0].stampedAt = "2026-10-15T09:00:00.000Z";

    const result = await verify(clipId, sha256Hex(originalFile), deps);

    expect(result.status).toBe("tampered");
  });

  it("rejects a hash that is not 64 lowercase hex characters", async () => {
    const { deps, clipId } = await setup();
    const response = await verifyClip(
      jsonRequest({ sha256: "ABC" }),
      clipId,
      deps,
    );
    expect(response.status).toBe(400);
  });

  it("returns 404 for an unknown clip", async () => {
    const { deps } = await setup();
    const response = await verifyClip(
      jsonRequest({ sha256: sha256Hex(originalFile) }),
      "0b5c7d1e-2f3a-4b5c-8d6e-7f8a9b0c1d2e",
      deps,
    );
    expect(response.status).toBe(404);
  });
});
