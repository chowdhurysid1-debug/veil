import { afterEach, describe, expect, it, vi } from "vitest";

import {
  apiErrorSchema,
  auditEntrySchema,
  clipDetailSchema,
  unlockResponseSchema,
} from "../../contracts";
import { runHandler } from "../deps";
import {
  jsonRequest,
  makeDeps,
  makeUpload,
  readBody,
  TEST_NOW,
  uploadClip,
} from "../testDeps";
import { getClipDetail } from "./clips";
import { listAudit, unlockFace } from "./unlock";

const validReason = {
  reasonCategory: "incident_investigation",
  reason: "Identify the student who fell so the nurse can follow up.",
};

async function setup() {
  const made = makeDeps();
  const upload = makeUpload({ frames: 2, facesPerFrame: 1 });
  const { clipId } = await uploadClip(made.deps, upload);
  const detail = clipDetailSchema.parse(
    await readBody(await getClipDetail(clipId, made.deps)),
  );
  return { ...made, upload, clipId, faceId: detail.faces[0].id };
}

describe("POST /api/faces/:id/unlock", () => {
  afterEach(() => vi.restoreAllMocks());

  it("writes an audit row, then returns the face key and a 30 second link", async () => {
    const { deps, store, upload, clipId, faceId } = await setup();

    const response = await unlockFace(jsonRequest(validReason), faceId, deps);

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = unlockResponseSchema.parse(await readBody(response));
    const face = upload.faces.find((candidate) => candidate.frameIndex === 0);
    expect(body).toMatchObject({
      faceId,
      rawKeyBase64: face?.rawKeyBase64,
      ivBase64: face?.ivBase64,
      ciphertextUrl: `https://storage.test/vault/${clipId}/${faceId}.bin?expires=30`,
      expiresAt: new Date(TEST_NOW.getTime() + 30_000).toISOString(),
    });
    expect(store.state.audit).toEqual([
      {
        id: body.auditId,
        faceId,
        actor: "Safety Officer, Demo High School",
        reasonCategory: "incident_investigation",
        reason: validReason.reason,
        createdAt: TEST_NOW.toISOString(),
      },
    ]);
  });

  it("returns no key when the audit row cannot be written", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { deps, store, upload, faceId } = await setup();
    store.insertAudit = vi.fn(async () => {
      throw new Error("insert into unlock_audit failed");
    });
    const signedUrls = vi.spyOn(deps.blobs, "signedUrls");

    const response = await runHandler(
      "unlockFace",
      (handlerDeps) =>
        unlockFace(jsonRequest(validReason), faceId, handlerDeps),
      () => deps,
    );

    expect(response.status).toBe(500);
    const raw = JSON.stringify(await readBody(response));
    for (const face of upload.faces) {
      expect(raw).not.toContain(face.rawKeyBase64);
    }
    expect(signedUrls).not.toHaveBeenCalled();
    expect(store.state.audit).toHaveLength(0);
  });

  it("records the audit row before any key material is touched", async () => {
    const { deps, store, faceId } = await setup();
    const order: string[] = [];
    const insertAudit = store.insertAudit.bind(store);
    store.insertAudit = async (entry) => {
      order.push("audit");
      await insertAudit(entry);
    };
    const signedUrls = deps.blobs.signedUrls.bind(deps.blobs);
    deps.blobs.signedUrls = async (...args) => {
      order.push(`sign:${store.state.audit.length}`);
      return signedUrls(...args);
    };

    await unlockFace(jsonRequest(validReason), faceId, deps);

    expect(order).toEqual(["audit", "sign:1"]);
  });

  it.each([
    [
      "a reason under 15 characters",
      { ...validReason, reason: "just looking" },
    ],
    [
      "a reason padded with spaces",
      { ...validReason, reason: "   why not      " },
    ],
    ["an unknown category", { ...validReason, reasonCategory: "curiosity" }],
    ["no reason at all", { reasonCategory: "other" }],
  ])("refuses %s and writes nothing", async (_name, body) => {
    const { deps, store, faceId } = await setup();

    const response = await unlockFace(jsonRequest(body), faceId, deps);

    expect(response.status).toBe(400);
    apiErrorSchema.parse(await readBody(response));
    expect(store.state.audit).toHaveLength(0);
  });

  it("explains the reason rule in plain words", async () => {
    const { deps, faceId } = await setup();
    const response = await unlockFace(
      jsonRequest({ ...validReason, reason: "just looking" }),
      faceId,
      deps,
    );
    expect(apiErrorSchema.parse(await readBody(response)).error).toBe(
      "Describe why you need to see this face, in at least 15 characters.",
    );
  });

  it("returns 404 for an unknown face and writes nothing", async () => {
    const { deps, store } = await setup();
    const response = await unlockFace(
      jsonRequest(validReason),
      "0b5c7d1e-2f3a-4b5c-8d6e-7f8a9b0c1d2e",
      deps,
    );
    expect(response.status).toBe(404);
    expect(store.state.audit).toHaveLength(0);
  });
});

describe("GET /api/audit", () => {
  it("lists every unlock newest first with its clip", async () => {
    const { deps, clipId, faceId } = await setup();
    let tick = 0;
    deps.now = () => new Date(TEST_NOW.getTime() + tick++ * 60_000);
    await unlockFace(jsonRequest(validReason), faceId, deps);
    await unlockFace(
      jsonRequest({
        reasonCategory: "safety_emergency",
        reason: "Fire alarm, confirming who is still in the hallway.",
      }),
      faceId,
      deps,
    );

    const entries = auditEntrySchema
      .array()
      .parse(await readBody(await listAudit(deps)));

    expect(entries.map((entry) => entry.reasonCategory)).toEqual([
      "safety_emergency",
      "incident_investigation",
    ]);
    expect(entries.every((entry) => entry.clipId === clipId)).toBe(true);
  });

  it("returns an empty list before anything is unlocked", async () => {
    const { deps } = makeDeps();
    expect(await readBody(await listAudit(deps))).toEqual([]);
  });
});
