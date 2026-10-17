import {
  eventTypeSchema,
  type AnalyzeResponse,
  type LearningStats,
} from "../contracts";
import { countByType, thresholdFromCounts } from "./thresholds";
import type { LabeledEvent } from "./types";

export const RECENT_LABELS = 10;
export const HISTORY_DAYS = 14;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function summarizeLabels(
  labels: LabeledEvent[],
): AnalyzeResponse["learnedFrom"] {
  return {
    labels: labels.length,
    sites: new Set(labels.map((label) => label.siteId)).size,
  };
}

// history[i] is the share of every label up to the end of that UTC day that was a false
// alarm. Cumulative, so one new label nudges the line instead of spiking a single day.
function cumulativeHistory(labels: LabeledEvent[]): LearningStats["history"] {
  const oldestFirst = [...labels].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );
  const byDay = new Map<string, number>();
  let total = 0;
  let falseAlarms = 0;
  for (const label of oldestFirst) {
    total += 1;
    if (label.label === "false_alarm") falseAlarms += 1;
    byDay.set(label.createdAt.slice(0, 10), round2(falseAlarms / total));
  }
  return [...byDay.entries()]
    .slice(-HISTORY_DAYS)
    .map(([date, falseAlarmRate]) => ({ date, falseAlarmRate }));
}

export function buildLearningStats(labels: LabeledEvent[]): LearningStats {
  const counts = countByType(labels);
  const { labels: totalLabels, sites: sitesContributing } =
    summarizeLabels(labels);

  return {
    totalLabels,
    sitesContributing,
    // All five types, so the panel layout never shifts. A type with 0 labels uses the default threshold.
    byType: eventTypeSchema.options.map((type) => ({
      type,
      labels: counts[type].labels,
      falseAlarmRate:
        counts[type].labels === 0
          ? 0
          : round2(counts[type].falseAlarms / counts[type].labels),
      threshold: thresholdFromCounts(
        counts[type].labels,
        counts[type].falseAlarms,
      ),
    })),
    recent: [...labels]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, RECENT_LABELS)
      .map((label) => ({
        eventType: label.eventType,
        label: label.label,
        siteName: label.siteName,
        createdAt: label.createdAt,
      })),
    history: cumulativeHistory(labels),
  };
}
