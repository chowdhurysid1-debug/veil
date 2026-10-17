import { eventTypeSchema, type EventType } from "../contracts";
import type { LabeledEvent } from "./types";

export type Thresholds = Record<EventType, number>;

// threshold = FLOOR + SPAN * smoothed false-alarm rate, so every type sits between 0.4 and 0.9.
// A type whose alerts officers keep rejecting needs more confidence before it alerts again.
export const THRESHOLD_FLOOR = 0.4;
export const THRESHOLD_SPAN = 0.5;

// A prior of 1 false alarm in 5 labels keeps a type with few labels near the middle,
// so a single label cannot swing it to an extreme.
export const PRIOR_LABELS = 5;
export const PRIOR_FALSE_ALARMS = 1;

export function smoothedFalseAlarmRate(
  labels: number,
  falseAlarms: number,
): number {
  return (falseAlarms + PRIOR_FALSE_ALARMS) / (labels + PRIOR_LABELS);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function thresholdFromCounts(
  labels: number,
  falseAlarms: number,
): number {
  return round2(
    THRESHOLD_FLOOR +
      THRESHOLD_SPAN * smoothedFalseAlarmRate(labels, falseAlarms),
  );
}

// Used for every type until there are labels to learn from. Equals thresholdFromCounts(0, 0).
export const DEFAULT_THRESHOLD = thresholdFromCounts(0, 0);

export function uniformThresholds(value = DEFAULT_THRESHOLD): Thresholds {
  return Object.fromEntries(
    eventTypeSchema.options.map((type) => [type, value]),
  ) as Thresholds;
}

export interface TypeCounts {
  labels: number;
  falseAlarms: number;
}

export function countByType(
  labels: LabeledEvent[],
): Record<EventType, TypeCounts> {
  const counts = Object.fromEntries(
    eventTypeSchema.options.map((type) => [
      type,
      { labels: 0, falseAlarms: 0 },
    ]),
  ) as Record<EventType, TypeCounts>;
  for (const label of labels) {
    counts[label.eventType].labels += 1;
    if (label.label === "false_alarm") counts[label.eventType].falseAlarms += 1;
  }
  return counts;
}

// Labels from every site count, which is how one school's false alarm helps a store.
export function learnedThresholds(labels: LabeledEvent[]): Thresholds {
  const counts = countByType(labels);
  return Object.fromEntries(
    eventTypeSchema.options.map((type) => [
      type,
      thresholdFromCounts(counts[type].labels, counts[type].falseAlarms),
    ]),
  ) as Thresholds;
}

export function isFlagged(confidence: number, threshold: number): boolean {
  return confidence >= threshold;
}
