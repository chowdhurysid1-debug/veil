import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { z } from "zod";

import {
  eventTypeSchema,
  feedbackLabelSchema,
  MAX_FRAMES,
  type EventType,
} from "../lib/contracts";
import { generateSummary } from "../lib/generate";
import { selectExamples } from "../lib/learning/fewShot";
import { SEED_SITES, seedLabeledEvents } from "../lib/learning/seed";
import { isFlagged, learnedThresholds } from "../lib/learning/thresholds";
import type { LabeledEvent } from "../lib/learning/types";
import { generateInputSchema, MAX_INPUT_CHARS } from "../lib/schemas";
import { analyzeFrames } from "../lib/server/analyzeFrames";
import { mapWithConcurrency } from "../lib/server/storage";

const summarizeCaseSchema = z.object({
  id: z.string(),
  input: z.unknown(),
  expect: z.enum(["ok", "rejected"]),
});

// Each frame is a text description of a blurred frame. Labels start from the seed history
// in lib/learning/seed.ts, plus any `addLabels`, and go through the same thresholds and
// few-shot selection as the app. `truth` is what really happens (used for precision);
// `expectFlagged` is what the demo needs (used for pass or fail). They differ only when the
// demo needs a false alarm to fire before anyone has taught the system otherwise.
const analyzeCaseSchema = z.object({
  kind: z.literal("analyze"),
  id: z.string(),
  why: z.string().optional(),
  frames: z.array(z.string().min(1)).min(1).max(MAX_FRAMES),
  addLabels: z
    .array(
      z.object({
        type: eventTypeSchema,
        label: feedbackLabelSchema,
        description: z.string().min(1),
        note: z.string().nullable().optional(),
      }),
    )
    .default([]),
  truth: z.array(eventTypeSchema),
  expectFlagged: z.array(eventTypeSchema),
});

type SummarizeCase = z.infer<typeof summarizeCaseSchema>;
type AnalyzeCase = z.infer<typeof analyzeCaseSchema>;

const FRAME_SPACING_SECONDS = 1.5;
const ANALYZE_CONCURRENCY = 4;

const envPath = resolve(".env.local");
if (existsSync(envPath)) process.loadEnvFile(envPath);

if (!process.env.ANTHROPIC_API_KEY) {
  console.error(
    "ANTHROPIC_API_KEY is not set. Add it to .env.local, then rerun npm run evals.",
  );
  process.exit(1);
}

const rawCases: unknown = JSON.parse(
  readFileSync(resolve("evals/demo-inputs.json"), "utf8"),
);
const cases = z.array(z.union([analyzeCaseSchema, summarizeCaseSchema])).parse(rawCases);
const analyzeCases = cases.filter(
  (evalCase): evalCase is AnalyzeCase => "kind" in evalCase,
);
const summarizeCases = cases.filter(
  (evalCase): evalCase is SummarizeCase => !("kind" in evalCase),
);

// Built here, not stored in the JSON, so the file stays readable.
summarizeCases.push({
  id: "oversized-text",
  input: { text: "a".repeat(MAX_INPUT_CHARS + 1) },
  expect: "rejected",
});

interface SummarizeRow {
  id: string;
  expected: string;
  result: string;
  isFallback: boolean | "-";
  ms: number;
  isPass: boolean;
}

async function runSummarizeCase({
  id,
  input,
  expect,
}: SummarizeCase): Promise<SummarizeRow> {
  const startedAt = performance.now();
  const parsed = generateInputSchema.safeParse(input);

  if (!parsed.success) {
    return {
      id,
      expected: expect,
      result: "rejected",
      isFallback: "-",
      ms: 0,
      isPass: expect === "rejected",
    };
  }

  const { isFallback } = await generateSummary(parsed.data);
  const ms = Math.round(performance.now() - startedAt);
  return {
    id,
    expected: expect,
    result: isFallback ? "fallback" : "ok",
    isFallback,
    ms,
    isPass: expect === "ok" && !isFallback,
  };
}

interface AnalyzeRow {
  id: string;
  truth: EventType[];
  expected: EventType[];
  flagged: EventType[];
  events: string;
  ms: number;
  isPass: boolean;
}

const now = new Date();
const demoSite = SEED_SITES[0];

function sameTypes(a: EventType[], b: EventType[]): boolean {
  return a.length === b.length && a.every((type) => b.includes(type));
}

async function runAnalyzeCase(evalCase: AnalyzeCase): Promise<AnalyzeRow> {
  const added = evalCase.addLabels.map(
    (label, index): LabeledEvent => ({
      eventId: `eval-${evalCase.id}-${index}`,
      eventType: label.type,
      description: label.description,
      label: label.label,
      note: label.note ?? null,
      siteId: demoSite.id,
      siteName: demoSite.name,
      createdAt: now.toISOString(),
    }),
  );
  const labels = [...seedLabeledEvents(now), ...added];
  const thresholds = learnedThresholds(labels);

  const startedAt = performance.now();
  const result = await analyzeFrames({
    frames: evalCase.frames.map((description, frameIndex) => ({
      frameIndex,
      tSeconds: frameIndex * FRAME_SPACING_SECONDS,
      description,
    })),
    examples: selectExamples(labels),
  });
  const ms = Math.round(performance.now() - startedAt);

  const flagged = [
    ...new Set(
      result.data.events
        .filter((event) => isFlagged(event.confidence, thresholds[event.type]))
        .map((event) => event.type),
    ),
  ];
  const events = result.isFallback
    ? "FALLBACK"
    : result.data.events
        .map(
          (event) =>
            `${event.type} ${event.confidence.toFixed(2)}/${thresholds[event.type].toFixed(2)}${isFlagged(event.confidence, thresholds[event.type]) ? " flagged" : ""}`,
        )
        .join(", ") || "none";

  return {
    id: evalCase.id,
    truth: evalCase.truth,
    expected: evalCase.expectFlagged,
    flagged,
    events,
    ms,
    isPass: !result.isFallback && sameTypes(flagged, evalCase.expectFlagged),
  };
}

function ratio(numerator: number, denominator: number): string {
  return denominator === 0 ? "-" : (numerator / denominator).toFixed(2);
}

const [summarizeRows, analyzeRows] = await Promise.all([
  Promise.all(summarizeCases.map(runSummarizeCase)),
  mapWithConcurrency(analyzeCases, ANALYZE_CONCURRENCY, runAnalyzeCase),
]);

console.log("\nSummarize (template demo)");
console.table(
  summarizeRows.map(({ isPass, ...row }) => ({
    pass: isPass ? "PASS" : "FAIL",
    ...row,
  })),
);

console.log("\nAnalyze (event / confidence / learned threshold)");
console.table(
  analyzeRows.map(({ isPass, truth, expected, flagged, ...row }) => ({
    pass: isPass ? "PASS" : "FAIL",
    id: row.id,
    truth: truth.join(",") || "none",
    expected: expected.join(",") || "none",
    flagged: flagged.join(",") || "none",
    events: row.events,
    ms: row.ms,
  })),
);

console.log("\nPrecision and recall per type, scored against truth");
console.table(
  eventTypeSchema.options.map((type) => {
    const tp = analyzeRows.filter(
      (row) => row.flagged.includes(type) && row.truth.includes(type),
    ).length;
    const fp = analyzeRows.filter(
      (row) => row.flagged.includes(type) && !row.truth.includes(type),
    ).length;
    const fn = analyzeRows.filter(
      (row) => !row.flagged.includes(type) && row.truth.includes(type),
    ).length;
    return {
      type,
      truePositives: tp,
      falsePositives: fp,
      missed: fn,
      precision: ratio(tp, tp + fp),
      recall: ratio(tp, tp + fn),
    };
  }),
);

const rows = [...summarizeRows, ...analyzeRows];
const failed = rows.filter((row) => !row.isPass).length;
console.log(
  failed === 0
    ? `All ${rows.length} cases passed.`
    : `${failed} of ${rows.length} cases failed.`,
);
process.exit(failed === 0 ? 0 : 1);
