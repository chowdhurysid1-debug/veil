// The learning curve experiment behind `npm run evals:learning`. A school and a store
// review alerts week by week; an officer labels only what gets flagged, as in the app.
// After each week the same test clips are scored with the labels so far, through the
// same thresholds and few-shot selection the app uses.
import { z } from "zod";

import {
  eventTypeSchema,
  MAX_FRAMES,
  type DetectedEvent,
  type EventType,
} from "../contracts";
import type { Analyzer } from "../server/analyzeFrames";
import { mapWithConcurrency } from "../server/storage";
import { selectExamples } from "./fewShot";
import { SEED_SITES } from "./seed";
import { isFlagged, learnedThresholds, type Thresholds } from "./thresholds";
import type { LabeledEvent } from "./types";

const curveSiteSchema = z.enum(["school", "store"]);
type CurveSite = z.infer<typeof curveSiteSchema>;

const curveClipSchema = z.object({
  id: z.string().min(1),
  frames: z.array(z.string().min(1)).min(1).max(MAX_FRAMES),
  truth: z.array(eventTypeSchema),
  why: z.string().optional(),
});

const streamClipSchema = curveClipSchema.extend({
  week: z.int().min(1),
  site: curveSiteSchema,
  note: z.string().nullable().default(null),
});

export const curveScenariosSchema = z.object({
  about: z.string(),
  weeks: z.int().min(0),
  stream: z.array(streamClipSchema),
  test: z.array(curveClipSchema).min(1),
});

export type CurveScenarios = z.infer<typeof curveScenariosSchema>;
type StreamClip = CurveScenarios["stream"][number];

const SITE_RECORDS = {
  school: SEED_SITES[0],
  store: SEED_SITES[1],
} as const satisfies Record<CurveSite, (typeof SEED_SITES)[number]>;

// The arms differ only in which sites' labels the system learns from. "store-only"
// asks whether a school that joins later starts ahead because a store labeled first.
export const ARMS = [
  { id: "one-site", label: "One school", sites: ["school"] },
  { id: "network", label: "School + store", sites: ["school", "store"] },
  { id: "store-only", label: "Store labels only", sites: ["store"] },
] as const satisfies ReadonlyArray<{
  id: string;
  label: string;
  sites: readonly CurveSite[];
}>;

export type ArmId = (typeof ARMS)[number]["id"];
const armIdSchema = z.enum(["one-site", "network", "store-only"]);

export interface ClipScore {
  falseAlarms: number;
  missed: number;
  caught: number;
}

// Scored per event type: a flagged type that did not happen is a false alarm,
// a type that happened but was not flagged is missed.
export function scoreClip(truth: EventType[], flagged: EventType[]): ClipScore {
  return {
    falseAlarms: flagged.filter((type) => !truth.includes(type)).length,
    missed: truth.filter((type) => !flagged.includes(type)).length,
    caught: truth.filter((type) => flagged.includes(type)).length,
  };
}

function flaggedEvents(
  events: DetectedEvent[],
  thresholds: Thresholds,
): DetectedEvent[] {
  return events.filter((event) =>
    isFlagged(event.confidence, thresholds[event.type]),
  );
}

interface OfficerLabelsInput {
  clip: StreamClip;
  events: DetectedEvent[];
  thresholds: Thresholds;
  createdAt: string;
}

// The officer reviews each flagged event: real if that type really happened.
export function officerLabels({
  clip,
  events,
  thresholds,
  createdAt,
}: OfficerLabelsInput): LabeledEvent[] {
  const site = SITE_RECORDS[clip.site];
  return flaggedEvents(events, thresholds).map((event, index) => ({
    eventId: `${clip.id}-${index}`,
    eventType: event.type,
    description: event.description,
    label: clip.truth.includes(event.type) ? "real" : "false_alarm",
    note: clip.note,
    siteId: site.id,
    siteName: site.name,
    createdAt,
  }));
}

export const clipResultSchema = z.object({
  id: z.string(),
  truth: z.array(eventTypeSchema),
  flagged: z.array(eventTypeSchema),
  events: z.string(),
  isFallback: z.boolean(),
});

export const curvePointSchema = z.object({
  week: z.int(),
  labels: z.int(),
  falseAlarmLabels: z.int(),
  falseAlarms: z.int(),
  missed: z.int(),
  caught: z.int(),
  fallbacks: z.int(),
  thresholds: z.record(eventTypeSchema, z.number()),
  // What the model saw of past labels when scoring this week. Older results lack it.
  examples: z
    .array(
      z.object({
        eventType: eventTypeSchema,
        label: z.enum(["real", "false_alarm"]),
        description: z.string(),
        note: z.string().nullable(),
      }),
    )
    .optional(),
  clips: z.array(clipResultSchema),
});

export const curveRunSchema = z.object({
  arms: z.array(
    z.object({
      id: armIdSchema,
      label: z.string(),
      points: z.array(curvePointSchema),
    }),
  ),
});

export type ClipResult = z.infer<typeof clipResultSchema>;
export type CurvePoint = z.infer<typeof curvePointSchema>;
export type CurveRun = z.infer<typeof curveRunSchema>;

interface RunCurveOptions {
  scenarios: CurveScenarios;
  analyze: Analyzer;
  startedAt: Date;
  concurrency?: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function describeEvents(events: DetectedEvent[], thresholds: Thresholds) {
  return (
    events
      .map(
        (event) =>
          `${event.type} ${event.confidence.toFixed(2)}/${thresholds[event.type].toFixed(2)}${isFlagged(event.confidence, thresholds[event.type]) ? " flagged" : ""}`,
      )
      .join(", ") || "none"
  );
}

export async function runCurve({
  scenarios,
  analyze,
  startedAt,
  concurrency = 4,
}: RunCurveOptions): Promise<CurveRun> {
  async function analyzeClip(frames: string[], labels: LabeledEvent[]) {
    const result = await analyze({
      frames: frames.map((description, frameIndex) => ({
        frameIndex,
        tSeconds: frameIndex * 1.5,
        description,
      })),
      examples: selectExamples(labels),
    });
    return {
      events: result.isFallback ? [] : result.data.events,
      isFallback: result.isFallback,
    };
  }

  async function scoreTest(
    week: number,
    labels: LabeledEvent[],
  ): Promise<CurvePoint> {
    const thresholds = learnedThresholds(labels);
    const clips = await mapWithConcurrency(
      scenarios.test,
      concurrency,
      async (clip): Promise<ClipResult> => {
        const { events, isFallback } = await analyzeClip(clip.frames, labels);
        const flagged = [
          ...new Set(
            flaggedEvents(events, thresholds).map((event) => event.type),
          ),
        ];
        return {
          id: clip.id,
          truth: clip.truth,
          flagged,
          events: isFallback ? "FALLBACK" : describeEvents(events, thresholds),
          isFallback,
        };
      },
    );
    const totals = clips.reduce<ClipScore>(
      (sum, clip) => {
        const score = scoreClip(clip.truth, clip.flagged);
        return {
          falseAlarms: sum.falseAlarms + score.falseAlarms,
          missed: sum.missed + score.missed,
          caught: sum.caught + score.caught,
        };
      },
      { falseAlarms: 0, missed: 0, caught: 0 },
    );
    return {
      week,
      labels: labels.length,
      falseAlarmLabels: labels.filter((label) => label.label === "false_alarm")
        .length,
      ...totals,
      fallbacks: clips.filter((clip) => clip.isFallback).length,
      thresholds,
      examples: selectExamples(labels),
      clips,
    };
  }

  // Labels arrive at the end of each week, so a week's clips are judged with
  // what was learned before it started.
  async function reviewWeek(
    week: number,
    sites: readonly CurveSite[],
    labels: LabeledEvent[],
  ): Promise<LabeledEvent[]> {
    const thresholds = learnedThresholds(labels);
    const clips = scenarios.stream.filter(
      (clip) => clip.week === week && sites.includes(clip.site),
    );
    const reviewed = await mapWithConcurrency(
      clips,
      concurrency,
      async (clip, index) => {
        const { events } = await analyzeClip(clip.frames, labels);
        const createdAt = new Date(
          startedAt.getTime() + week * 7 * DAY_MS + index * 60_000,
        ).toISOString();
        return officerLabels({ clip, events, thresholds, createdAt });
      },
    );
    return reviewed.flat();
  }

  const weekZero = await scoreTest(0, []);

  const arms = await Promise.all(
    ARMS.map(async (arm) => {
      const points = [weekZero];
      let labels: LabeledEvent[] = [];
      for (let week = 1; week <= scenarios.weeks; week += 1) {
        labels = [...labels, ...(await reviewWeek(week, arm.sites, labels))];
        points.push(await scoreTest(week, labels));
      }
      return { id: arm.id, label: arm.label, points };
    }),
  );

  return { arms };
}

const spreadSchema = z.object({
  mean: z.number(),
  min: z.number(),
  max: z.number(),
});

const summaryPointSchema = z.object({
  week: z.int(),
  labels: spreadSchema,
  falseAlarms: spreadSchema,
  missed: spreadSchema,
  caught: spreadSchema,
  fallbacks: spreadSchema,
});

const armSummarySchema = z.object({
  id: armIdSchema,
  label: z.string(),
  points: z.array(summaryPointSchema),
});

export type Spread = z.infer<typeof spreadSchema>;
export type SummaryPoint = z.infer<typeof summaryPointSchema>;
export type ArmSummary = z.infer<typeof armSummarySchema>;

function spread(values: number[]): Spread {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return {
    mean: Math.round(mean * 10) / 10,
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

// Averages every week across repeated runs, keeping the range so noise is visible.
export function summarizeRuns(runs: CurveRun[]): ArmSummary[] {
  return ARMS.map((arm) => {
    const perRun = runs.map((run) => {
      const found = run.arms.find((candidate) => candidate.id === arm.id);
      if (!found) throw new Error(`Run is missing the ${arm.id} arm.`);
      return found.points;
    });
    const weeks = perRun[0]?.length ?? 0;
    return {
      id: arm.id,
      label: arm.label,
      points: Array.from({ length: weeks }, (_, index) => {
        const at = perRun.map((points) => points[index]);
        return {
          week: at[0].week,
          labels: spread(at.map((point) => point.labels)),
          falseAlarms: spread(at.map((point) => point.falseAlarms)),
          missed: spread(at.map((point) => point.missed)),
          caught: spread(at.map((point) => point.caught)),
          fallbacks: spread(at.map((point) => point.fallbacks)),
        };
      }),
    };
  });
}

// What scripts/learning-curve.mts writes to evals/results/learning-curve.json.
export const curveResultsSchema = z.object({
  generatedAt: z.string(),
  model: z.string(),
  commit: z.string(),
  testClips: z.int(),
  harmlessTestClips: z.int(),
  realTestEvents: z.int(),
  streamClips: z.record(curveSiteSchema, z.int()),
  runs: z.array(curveRunSchema).min(1),
});

export type CurveResults = z.infer<typeof curveResultsSchema>;

// The small file the app and the pitch import: evals/results/learning-curve-summary.json.
export const curveSummarySchema = curveResultsSchema
  .omit({ runs: true })
  .extend({
    runs: z.int().min(1),
    arms: z.array(armSummarySchema),
    // True when every real incident that went unflagged was a call that failed to
    // parse (the app shows those as "review manually"), not learning hiding it.
    everyMissWasFailedCall: z.boolean(),
  });

export type CurveSummary = z.infer<typeof curveSummarySchema>;

export function buildSummary({ runs, ...meta }: CurveResults): CurveSummary {
  const clips = runs.flatMap((run) =>
    run.arms.flatMap((arm) => arm.points.flatMap((point) => point.clips)),
  );
  return {
    ...meta,
    runs: runs.length,
    arms: summarizeRuns(runs),
    everyMissWasFailedCall: clips
      .filter((clip) => scoreClip(clip.truth, clip.flagged).missed > 0)
      .every((clip) => clip.isFallback),
  };
}
