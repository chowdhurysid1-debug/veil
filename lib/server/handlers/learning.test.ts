import { describe, expect, it, vi } from "vitest";

import {
  analyzeResponseSchema,
  apiErrorSchema,
  clipDetailSchema,
  feedbackResponseSchema,
  learningStatsSchema,
  type DetectedEvent,
} from "../../contracts";
import type { AnalyzeInput } from "../analyzeFrames";
import { seedMemoryStore } from "../memoryStore";
import {
  fakeAnalyzer,
  jsonRequest,
  makeDeps,
  readBody,
  TEST_NOW,
  uploadClip,
} from "../testDeps";
import { analyzeClip } from "./analyze";
import { getClipDetail } from "./clips";
import { getLearningStats, submitFeedback } from "./learning";

const shoeTie: DetectedEvent = {
  frameIndex: 1,
  type: "fall",
  confidence: 0.71,
  description: "A person goes from standing to crouching near the lockers.",
};

async function setup() {
  const made = makeDeps({ analyze: fakeAnalyzer([shoeTie]) });
  seedMemoryStore(made.store, TEST_NOW);
  const { clipId } = await uploadClip(made.deps);
  const analysis = analyzeResponseSchema.parse(
    await readBody(await analyzeClip(clipId, made.deps)),
  );
  return { ...made, clipId, eventId: analysis.events[0].id };
}

async function feedback(
  eventId: string,
  body: unknown,
  deps: ReturnType<typeof makeDeps>["deps"],
) {
  return submitFeedback(jsonRequest(body), eventId, deps);
}

describe("POST /api/events/:id/feedback", () => {
  it("records a false alarm and returns updated stats", async () => {
    const { deps, eventId } = await setup();

    const response = await feedback(
      eventId,
      { label: "false_alarm", note: "Sat down to tie a shoe." },
      deps,
    );

    expect(response.status).toBe(200);
    const body = feedbackResponseSchema.parse(await readBody(response));
    expect(body).toMatchObject({ eventId, label: "false_alarm" });
    expect(body.stats.totalLabels).toBe(21);
    expect(body.stats.sitesContributing).toBe(2);
    expect(body.stats.byType.find((row) => row.type === "fall")).toEqual({
      type: "fall",
      labels: 10,
      falseAlarmRate: 0.5,
      threshold: 0.6,
    });
    expect(body.stats.recent[0]).toMatchObject({
      eventType: "fall",
      label: "false_alarm",
      siteName: "Demo High School",
    });
  });

  it("shows the label on the clip afterwards", async () => {
    const { deps, clipId, eventId } = await setup();
    await feedback(eventId, { label: "real" }, deps);

    const detail = clipDetailSchema.parse(
      await readBody(await getClipDetail(clipId, deps)),
    );
    expect(detail.events[0].label).toBe("real");
  });

  it("replaces the label when the same event is labeled again", async () => {
    const { deps, eventId } = await setup();
    await feedback(eventId, { label: "false_alarm" }, deps);
    const response = await feedback(eventId, { label: "real" }, deps);

    const body = feedbackResponseSchema.parse(await readBody(response));
    expect(body.stats.totalLabels).toBe(21);
    expect(body.stats.byType.find((row) => row.type === "fall")).toMatchObject({
      labels: 10,
      falseAlarmRate: 0.4,
    });
  });

  it("stores a blank note as no note", async () => {
    const { deps, store, eventId } = await setup();
    await feedback(eventId, { label: "real", note: "   " }, deps);
    expect(
      store.state.feedback.find((row) => row.eventId === eventId)?.note,
    ).toBeNull();
  });

  it.each([
    ["an unknown label", { label: "maybe" }],
    ["a note over 200 characters", { label: "real", note: "a".repeat(201) }],
    ["a missing label", {}],
  ])("rejects %s", async (_name, body) => {
    const { deps, store, eventId } = await setup();
    const before = store.state.feedback.length;
    const response = await feedback(eventId, body, deps);
    expect(response.status).toBe(400);
    apiErrorSchema.parse(await readBody(response));
    expect(store.state.feedback).toHaveLength(before);
  });

  it("returns 404 for an unknown event", async () => {
    const { deps } = await setup();
    const response = await feedback(
      "0b5c7d1e-2f3a-4b5c-8d6e-7f8a9b0c1d2e",
      { label: "real" },
      deps,
    );
    expect(response.status).toBe(404);
  });
});

describe("GET /api/learning/stats", () => {
  it("returns stats that match the contract", async () => {
    const { deps } = await setup();
    const stats = learningStatsSchema.parse(
      await readBody(await getLearningStats(deps)),
    );
    expect(stats.totalLabels).toBe(20);
  });
});

describe("demo path, steps 1 to 4", () => {
  it("flags the first shoe-tying clip, learns from the false alarm, then holds back on the next", async () => {
    const { deps, eventId } = await setup();
    expect(
      (await readBody(
        await getClipDetail((await deps.store.listClips(1))[0].id, deps),
      )) as {
        eventsFlagged: number;
      },
    ).toMatchObject({ eventsFlagged: 1 });

    await feedback(
      eventId,
      { label: "false_alarm", note: "Sat down to tie a shoe." },
      deps,
    );

    // The second clip's model sees the new label and lowers its confidence, as the prompt asks.
    const secondModel = vi.fn(async (input: AnalyzeInput) => {
      const learned = input.examples.some(
        (example) =>
          example.label === "false_alarm" &&
          example.note === "Sat down to tie a shoe.",
      );
      return {
        data: { events: [{ ...shoeTie, confidence: learned ? 0.35 : 0.71 }] },
        isFallback: false,
      };
    });
    deps.analyze = secondModel;
    const second = await uploadClip(deps);
    const analysis = analyzeResponseSchema.parse(
      await readBody(await analyzeClip(second.clipId, deps)),
    );

    expect(analysis.events[0]).toMatchObject({
      type: "fall",
      flagged: false,
      threshold: 0.6,
    });
    expect(analysis.learnedFrom).toEqual({ labels: 21, sites: 2 });
  });
});
