import { afterEach, describe, expect, it, vi } from "vitest";

import {
  analyzeResponseSchema,
  clipDetailSchema,
  type DetectedEvent,
} from "../../contracts";
import { seedMemoryStore } from "../memoryStore";
import {
  fakeAnalyzer,
  makeDeps,
  makeUpload,
  readBody,
  TEST_NOW,
  uploadClip,
} from "../testDeps";
import { analyzeClip } from "./analyze";
import { getClipDetail } from "./clips";

const fall: DetectedEvent = {
  frameIndex: 1,
  type: "fall",
  confidence: 0.71,
  description: "A person goes from standing to the floor near the lockers.",
};
const unsure: DetectedEvent = {
  frameIndex: 2,
  type: "theft",
  confidence: 0.3,
  description: "A person puts something into a bag.",
};

async function analyzed(response: Response) {
  expect(response.status).toBe(200);
  return analyzeResponseSchema.parse(await readBody(response));
}

describe("POST /api/clips/:id/analyze", () => {
  afterEach(() => vi.restoreAllMocks());

  it("stores detected events and flags those at or above the threshold", async () => {
    const analyze = fakeAnalyzer([fall, unsure]);
    const { deps, store } = makeDeps({ analyze });
    const { clipId } = await uploadClip(deps);

    const body = await analyzed(await analyzeClip(clipId, deps));

    expect(body.isFallback).toBe(false);
    expect(body.events).toMatchObject([
      { ...fall, clipId, flagged: true, threshold: 0.5, label: null },
      { ...unsure, clipId, flagged: false, threshold: 0.5, label: null },
    ]);
    expect(store.state.events).toHaveLength(2);
  });

  it("sends the model only the blurred frames that were uploaded", async () => {
    const analyze = fakeAnalyzer([]);
    const { deps } = makeDeps({ analyze });
    const upload = makeUpload({ frames: 3, facesPerFrame: 2 });
    const { clipId } = await uploadClip(deps, upload);

    await analyzeClip(clipId, deps);

    const sent = analyze.mock.calls[0][0].frames;
    expect(sent.map((frame) => frame.frameIndex)).toEqual([0, 1, 2]);
    expect(
      sent.map((frame) => Buffer.from(frame.image ?? []).toString("base64")),
    ).toEqual(upload.frames.map((frame) => frame.blurredJpegBase64));
  });

  it("returns stored events on a second call without calling the model again", async () => {
    const analyze = fakeAnalyzer([fall]);
    const { deps } = makeDeps({ analyze });
    const { clipId } = await uploadClip(deps);

    const first = await analyzed(await analyzeClip(clipId, deps));
    const second = await analyzed(await analyzeClip(clipId, deps));

    expect(analyze).toHaveBeenCalledTimes(1);
    expect(second.events).toEqual(first.events);
  });

  it("returns the fallback, stores nothing, and still answers 200 when the model fails", async () => {
    const { deps, store } = makeDeps({ analyze: fakeAnalyzer(null) });
    const { clipId } = await uploadClip(deps);

    const body = await analyzed(await analyzeClip(clipId, deps));

    expect(body).toMatchObject({ clipId, events: [], isFallback: true });
    expect(store.state.events).toHaveLength(0);
    expect(store.state.clips).toHaveLength(1);
  });

  it("returns the fallback without calling the model once the daily cap is spent", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const analyze = fakeAnalyzer([fall]);
    const { deps } = makeDeps({
      analyze,
      analyzeCap: { tryConsume: () => false },
    });
    const { clipId } = await uploadClip(deps);

    const body = await analyzed(await analyzeClip(clipId, deps));

    expect(body.isFallback).toBe(true);
    expect(analyze).not.toHaveBeenCalled();
  });

  it("returns the fallback when the frames cannot be loaded", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const analyze = fakeAnalyzer([fall]);
    const { deps, blobs } = makeDeps({ analyze });
    const { clipId } = await uploadClip(deps);
    blobs.download = async () => {
      throw new Error("storage timeout");
    };

    const body = await analyzed(await analyzeClip(clipId, deps));

    expect(body.isFallback).toBe(true);
    expect(analyze).not.toHaveBeenCalled();
  });

  it("reports how many labels and sites the analysis learned from", async () => {
    const { deps, store } = makeDeps({ analyze: fakeAnalyzer([fall]) });
    seedMemoryStore(store, TEST_NOW);
    const { clipId } = await uploadClip(deps);

    const body = await analyzed(await analyzeClip(clipId, deps));

    expect(body.learnedFrom).toEqual({ labels: 20, sites: 2 });
  });

  it("returns 404 for a missing or malformed clip id", async () => {
    const { deps } = makeDeps();
    expect(
      (await analyzeClip("0b5c7d1e-2f3a-4b5c-8d6e-7f8a9b0c1d2e", deps)).status,
    ).toBe(404);
    expect((await analyzeClip("not-a-uuid", deps)).status).toBe(404);
  });
});

describe("GET /api/clips/:id", () => {
  it("returns signed frame URLs, events, and face boxes without any key material", async () => {
    const { deps } = makeDeps({ analyze: fakeAnalyzer([fall]) });
    const upload = makeUpload({ frames: 3, facesPerFrame: 1 });
    const { clipId } = await uploadClip(deps, upload);
    await analyzeClip(clipId, deps);

    const response = await getClipDetail(clipId, deps);
    const raw = JSON.stringify(await readBody(response.clone()));
    const body = clipDetailSchema.parse(await readBody(response));

    expect(body).toMatchObject({
      id: clipId,
      filename: upload.filename,
      siteName: "Demo High School",
      facesLocked: 3,
      eventsFlagged: 1,
    });
    expect(body.frames.map((frame) => frame.blurredUrl)).toEqual([
      `https://storage.test/frames/${clipId}/00.jpg?expires=600`,
      `https://storage.test/frames/${clipId}/01.jpg?expires=600`,
      `https://storage.test/frames/${clipId}/02.jpg?expires=600`,
    ]);
    expect(body.events).toHaveLength(1);
    for (const face of upload.faces) {
      expect(raw).not.toContain(face.rawKeyBase64);
      expect(raw).not.toContain(face.ivBase64);
    }
    expect(raw).not.toMatch(/wrapped|vault|\.bin/);
  });

  it("returns 404 for an unknown clip", async () => {
    const { deps } = makeDeps();
    expect(
      (await getClipDetail("0b5c7d1e-2f3a-4b5c-8d6e-7f8a9b0c1d2e", deps))
        .status,
    ).toBe(404);
  });
});

describe("learning applied to analysis", () => {
  it("flags each type against its own learned threshold", async () => {
    const borderline = 0.55;
    const { deps, store } = makeDeps({
      analyze: fakeAnalyzer([
        { ...fall, confidence: borderline },
        { ...fall, frameIndex: 2, type: "fight", confidence: borderline },
      ]),
    });
    seedMemoryStore(store, TEST_NOW);
    const { clipId } = await uploadClip(deps);

    const body = await analyzed(await analyzeClip(clipId, deps));

    expect(
      body.events.map(({ type, threshold, flagged }) => ({
        type,
        threshold,
        flagged,
      })),
    ).toEqual([
      { type: "fall", threshold: 0.58, flagged: false },
      { type: "fight", threshold: 0.5, flagged: true },
    ]);
    expect(
      store.state.events.filter((event) => event.clipId === clipId),
    ).toHaveLength(2);
  });

  it("gives the model reviewed examples from every site without naming any site", async () => {
    const analyze = fakeAnalyzer([]);
    const { deps, store } = makeDeps({ analyze });
    seedMemoryStore(store, TEST_NOW);
    const { clipId } = await uploadClip(deps);

    await analyzeClip(clipId, deps);

    const { examples } = analyze.mock.calls[0][0];
    const sent = new Set(examples.map((example) => example.description));
    const labels = await store.listLabels();
    const sitesUsed = new Set(
      labels
        .filter((label) => sent.has(label.description))
        .map((label) => label.siteName),
    );
    expect(sitesUsed.size).toBe(2);
    expect(JSON.stringify(examples)).not.toMatch(
      /Demo High School|Northside Market/,
    );
  });

  it("runs one model call when the same clip is analyzed twice at once", async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const analyze = vi.fn(async () => {
      await gate;
      return { data: { events: [fall] }, isFallback: false };
    });
    const { deps, store } = makeDeps({ analyze });
    const { clipId } = await uploadClip(deps);

    const first = analyzeClip(clipId, deps);
    const second = analyzeClip(clipId, deps);
    await new Promise((resolve) => setTimeout(resolve, 10));
    release();
    const [a, b] = await Promise.all([first, second]);

    expect(analyze).toHaveBeenCalledTimes(1);
    expect((await analyzed(a)).events).toEqual((await analyzed(b)).events);
    expect(store.state.events).toHaveLength(1);
  });
});
