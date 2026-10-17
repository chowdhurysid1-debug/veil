import { describe, expect, it } from "vitest";

import { MOCK_LEARNING_STATS, MOCK_SCENARIOS } from "../../lib/mock";
import { applyFeedbackToStats, thresholdFor } from "./mockBackend";

const NOW = "2026-10-16T21:05:00.000Z";

function label(
  eventType: "fall" | "other",
  value: "real" | "false_alarm",
  stats = MOCK_LEARNING_STATS,
) {
  return applyFeedbackToStats(stats, {
    eventType,
    label: value,
    siteName: "Demo High School",
    createdAt: NOW,
    day: "2026-10-16",
  });
}

describe("applyFeedbackToStats", () => {
  it("raises the threshold and false-alarm rate after a false alarm", () => {
    const next = label("fall", "false_alarm");
    const fall = next.byType.find((row) => row.type === "fall");
    expect(fall?.threshold).toBeGreaterThan(0.6);
    expect(fall?.labels).toBe(10);
    expect(fall?.falseAlarmRate).toBe(0.5);
    expect(next.totalLabels).toBe(MOCK_LEARNING_STATS.totalLabels + 1);
  });

  it("lowers the threshold after a real label", () => {
    const next = label("fall", "real");
    expect(thresholdFor(next, "fall")).toBeLessThan(0.6);
  });

  it("adds a row for a type with no labels yet", () => {
    const next = label("other", "false_alarm");
    const other = next.byType.find((row) => row.type === "other");
    expect(other).toEqual({
      type: "other",
      labels: 1,
      falseAlarmRate: 1,
      threshold: 0.58,
    });
  });

  it("puts the new label first and keeps at most 10 recent labels", () => {
    let stats = MOCK_LEARNING_STATS;
    for (let index = 0; index < 12; index++) {
      stats = label("fall", "real", stats);
    }
    expect(stats.recent).toHaveLength(10);
    expect(stats.recent[0].createdAt).toBe(NOW);
  });

  it("updates today's history point instead of adding a duplicate", () => {
    const next = label("fall", "false_alarm");
    expect(next.history).toHaveLength(MOCK_LEARNING_STATS.history.length);
    expect(next.history.at(-1)?.date).toBe("2026-10-16");
  });

  it("does not mutate the input stats", () => {
    const before = structuredClone(MOCK_LEARNING_STATS);
    label("fall", "false_alarm");
    expect(MOCK_LEARNING_STATS).toEqual(before);
  });
});

describe("demo path on mock data", () => {
  const [shoeTie, similar, realFall] = MOCK_SCENARIOS;

  it("flags the first clip before any new label", () => {
    expect(shoeTie.event.confidence).toBeGreaterThanOrEqual(
      thresholdFor(MOCK_LEARNING_STATS, "fall"),
    );
  });

  it("stops flagging the similar clip after one false alarm, but still flags a real fall", () => {
    const learned = label("fall", "false_alarm");
    const threshold = thresholdFor(learned, "fall");
    expect(similar.event.confidence).toBeLessThan(threshold);
    expect(realFall.event.confidence).toBeGreaterThanOrEqual(threshold);
  });
});
