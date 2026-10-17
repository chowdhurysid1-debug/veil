import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import type { AnalyzeOutput, DetectedEvent } from "../contracts";
import type { AnalyzeInput } from "../server/analyzeFrames";
import {
  ARMS,
  buildSummary,
  curveResultsSchema,
  curveSummarySchema,
  curveScenariosSchema,
  officerLabels,
  runCurve,
  scoreClip,
  summarizeRuns,
  type CurveScenarios,
} from "./curve";
import { uniformThresholds } from "./thresholds";

const scenarios = curveScenariosSchema.parse(
  JSON.parse(readFileSync(resolve("evals/learning-curve.json"), "utf8")),
);

function event(
  type: DetectedEvent["type"],
  confidence: number,
  description = `${type} seen`,
): DetectedEvent {
  return { frameIndex: 0, type, confidence, description };
}

describe("evals/learning-curve.json", () => {
  it("has unique ids and keeps the test clips out of the stream", () => {
    const ids = [...scenarios.stream, ...scenarios.test].map((clip) => clip.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives both sites clips in every week", () => {
    for (let week = 1; week <= scenarios.weeks; week += 1) {
      const sites = new Set(
        scenarios.stream
          .filter((clip) => clip.week === week)
          .map((clip) => clip.site),
      );
      expect(sites).toEqual(new Set(["school", "store"]));
    }
  });

  it("tests on both harmless clips and real incidents", () => {
    expect(scenarios.test.some((clip) => clip.truth.length === 0)).toBe(true);
    expect(scenarios.test.some((clip) => clip.truth.length > 0)).toBe(true);
  });
});

describe("scoreClip", () => {
  it("counts every flagged type on a harmless clip as a false alarm", () => {
    expect(scoreClip([], ["fight", "fall"])).toEqual({
      falseAlarms: 2,
      missed: 0,
      caught: 0,
    });
  });

  it("counts caught, missed, and wrong-type flags on a real clip", () => {
    expect(scoreClip(["fight"], ["fight"])).toEqual({
      falseAlarms: 0,
      missed: 0,
      caught: 1,
    });
    expect(scoreClip(["fight"], ["theft"])).toEqual({
      falseAlarms: 1,
      missed: 1,
      caught: 0,
    });
  });
});

describe("officerLabels", () => {
  const school = scenarios.stream.find((clip) => clip.site === "school");
  if (!school) throw new Error("No school clip in the stream.");
  const createdAt = "2026-10-17T09:00:00.000Z";

  it("labels only flagged events", () => {
    const labels = officerLabels({
      clip: { ...school, truth: [] },
      events: [event("fight", 0.65), event("fall", 0.3)],
      thresholds: uniformThresholds(0.5),
      createdAt,
    });
    expect(labels.map((label) => label.eventType)).toEqual(["fight"]);
  });

  it("marks a flag real when its type is in the truth, with the officer note", () => {
    const [label] = officerLabels({
      clip: { ...school, truth: ["fight"], note: "Fight." },
      events: [event("fight", 0.9, "Two people trade punches.")],
      thresholds: uniformThresholds(0.5),
      createdAt,
    });
    expect(label).toMatchObject({
      label: "real",
      description: "Two people trade punches.",
      note: "Fight.",
      siteName: "Demo High School",
      createdAt,
    });
  });

  it("marks a flag of the wrong type a false alarm", () => {
    const [label] = officerLabels({
      clip: { ...school, truth: ["fight"] },
      events: [event("theft", 0.7)],
      thresholds: uniformThresholds(0.5),
      createdAt,
    });
    expect(label.label).toBe("false_alarm");
  });
});

// A stand-in for the model: it repeats a false alarm until an officer has
// labeled that pattern, and always reports real incidents at high confidence.
function fakeAnalyze(input: AnalyzeInput): Promise<{
  data: AnalyzeOutput;
  isFallback: boolean;
}> {
  const text = input.frames.map((frame) => frame.description).join(" ");
  const taught = (word: string) =>
    input.examples.some(
      (example) =>
        example.label === "false_alarm" && example.description.includes(word),
    );
  const events: DetectedEvent[] = [];
  if (text.includes("HUG")) {
    events.push(event("fight", taught("hug") ? 0.2 : 0.65, "A hug"));
  }
  if (text.includes("OWNBAG")) {
    events.push(event("theft", taught("bag") ? 0.2 : 0.65, "Takes a bag"));
  }
  if (text.includes("PUNCH")) events.push(event("fight", 0.9, "Punches"));
  return Promise.resolve({ data: { events }, isFallback: false });
}

function clip(
  id: string,
  words: string,
  truth: CurveScenarios["test"][number]["truth"],
) {
  return { id, frames: [words], truth };
}

const tiny: CurveScenarios = {
  about: "Fixture",
  weeks: 2,
  stream: [
    { ...clip("s1-hug", "HUG", []), week: 1, site: "school", note: null },
    { ...clip("s1-bag", "OWNBAG", []), week: 1, site: "store", note: null },
    {
      ...clip("s2-punch", "PUNCH", ["fight"]),
      week: 2,
      site: "school",
      note: null,
    },
  ],
  test: [
    clip("t-hug", "HUG", []),
    clip("t-bag", "OWNBAG", []),
    clip("t-punch", "PUNCH", ["fight"]),
  ],
};

describe("runCurve", () => {
  it("scores week 0 once and shares it between arms", async () => {
    let calls = 0;
    const run = await runCurve({
      scenarios: tiny,
      analyze: (input) => {
        calls += 1;
        return fakeAnalyze(input);
      },
      startedAt: new Date("2026-10-17T00:00:00.000Z"),
    });
    // Week 0: 3 test clips. Then stream clips plus 2 weeks x 3 test clips per arm:
    // one site reviews 2 stream clips, the network 3, the store alone 1.
    expect(calls).toBe(3 + (2 + 6) + (3 + 6) + (1 + 6));
    expect(run.arms.map((arm) => arm.id)).toEqual(ARMS.map((arm) => arm.id));
    expect(run.arms[0].points[0]).toEqual(run.arms[1].points[0]);
  });

  it("learns from labels, and learns more with a second site", async () => {
    const run = await runCurve({
      scenarios: tiny,
      analyze: fakeAnalyze,
      startedAt: new Date("2026-10-17T00:00:00.000Z"),
    });
    const [oneSite, network, storeOnly] = run.arms;

    expect(oneSite.points.map((point) => point.falseAlarms)).toEqual([2, 1, 1]);
    expect(network.points.map((point) => point.falseAlarms)).toEqual([2, 0, 0]);
    expect(network.points.map((point) => point.missed)).toEqual([0, 0, 0]);
    expect(network.points.at(-1)?.labels).toBe(3);
    // The store only ever saw the bag pattern, so only that one transfers.
    expect(storeOnly.points.map((point) => point.falseAlarms)).toEqual([2, 1, 1]);
  });

  it("counts a fallback as no events and reports it", async () => {
    const run = await runCurve({
      scenarios: { ...tiny, weeks: 0, stream: [] },
      analyze: () =>
        Promise.resolve({ data: { events: [] }, isFallback: true }),
      startedAt: new Date("2026-10-17T00:00:00.000Z"),
    });
    expect(run.arms[0].points[0]).toMatchObject({
      fallbacks: 3,
      missed: 1,
      falseAlarms: 0,
    });
  });
});

describe("summarizeRuns", () => {
  it("averages each week across runs and keeps the range", async () => {
    const run = await runCurve({
      scenarios: tiny,
      analyze: fakeAnalyze,
      startedAt: new Date("2026-10-17T00:00:00.000Z"),
    });
    const summary = summarizeRuns([run, run]);
    const network = summary.find((arm) => arm.id === "network");
    expect(network?.points[1]).toMatchObject({
      week: 1,
      falseAlarms: { mean: 0, min: 0, max: 0 },
      labels: { mean: 2, min: 2, max: 2 },
    });
  });
});

describe("evals/results", () => {
  it("keeps the committed summary in sync with the committed results", () => {
    const read = (file: string): unknown =>
      JSON.parse(readFileSync(resolve("evals/results", file), "utf8"));
    const results = curveResultsSchema.parse(read("learning-curve.json"));
    const summary = curveSummarySchema.parse(read("learning-curve-summary.json"));
    expect(summary).toEqual(buildSummary(results));
  });
});
