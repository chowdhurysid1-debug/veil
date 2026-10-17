import { describe, expect, it } from "vitest";

import { learningStatsSchema } from "../contracts";
import { seedLabeledEvents } from "./seed";
import { buildLearningStats, RECENT_LABELS } from "./stats";

const now = new Date("2026-10-16T21:04:00.000Z");
const seed = seedLabeledEvents(now);

describe("buildLearningStats", () => {
  it("matches the contract", () => {
    expect(
      learningStatsSchema.safeParse(buildLearningStats(seed)).success,
    ).toBe(true);
  });

  it("counts labels and contributing sites", () => {
    const stats = buildLearningStats(seed);
    expect(stats.totalLabels).toBe(20);
    expect(stats.sitesContributing).toBe(2);
  });

  it("reports raw false-alarm rates and learned thresholds for all five types", () => {
    expect(buildLearningStats(seed).byType).toEqual([
      { type: "fall", labels: 9, falseAlarmRate: 0.44, threshold: 0.58 },
      { type: "fight", labels: 5, falseAlarmRate: 0.2, threshold: 0.5 },
      { type: "theft", labels: 5, falseAlarmRate: 0.2, threshold: 0.5 },
      { type: "fire", labels: 0, falseAlarmRate: 0, threshold: 0.5 },
      { type: "other", labels: 1, falseAlarmRate: 0, threshold: 0.48 },
    ]);
  });

  it("lists the newest 10 labels, newest first", () => {
    const { recent } = buildLearningStats(seed);
    expect(recent).toHaveLength(RECENT_LABELS);
    const times = recent.map((label) => label.createdAt);
    expect([...times].sort().reverse()).toEqual(times);
  });

  it("tracks the cumulative false-alarm rate by day", () => {
    expect(buildLearningStats(seed).history).toEqual([
      { date: "2026-10-10", falseAlarmRate: 0 },
      { date: "2026-10-11", falseAlarmRate: 0.38 },
      { date: "2026-10-12", falseAlarmRate: 0.36 },
      { date: "2026-10-13", falseAlarmRate: 0.43 },
      { date: "2026-10-14", falseAlarmRate: 0.35 },
      { date: "2026-10-15", falseAlarmRate: 0.3 },
    ]);
  });

  it("returns zeros and empty lists with no labels", () => {
    const stats = buildLearningStats([]);
    expect(stats).toMatchObject({
      totalLabels: 0,
      sitesContributing: 0,
      recent: [],
      history: [],
    });
    expect(stats.byType.every((row) => row.threshold === 0.5)).toBe(true);
  });
});
