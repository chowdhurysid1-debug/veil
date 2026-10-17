import { describe, expect, it } from "vitest";

import { seedLabeledEvents } from "./seed";
import {
  DEFAULT_THRESHOLD,
  isFlagged,
  learnedThresholds,
  thresholdFromCounts,
} from "./thresholds";
import type { LabeledEvent } from "./types";

const now = new Date("2026-10-16T21:04:00.000Z");

function label(
  overrides: Partial<LabeledEvent> & Pick<LabeledEvent, "label">,
): LabeledEvent {
  return {
    eventId: crypto.randomUUID(),
    eventType: "fall",
    description: "A person goes from standing to crouching near the lockers.",
    note: null,
    siteId: "3f2b8c1e-5d4a-4b7e-9c1f-2a6d8e0b4c71",
    siteName: "Demo High School",
    createdAt: now.toISOString(),
    ...overrides,
  };
}

describe("thresholdFromCounts", () => {
  it("starts every type at the default with no labels", () => {
    expect(thresholdFromCounts(0, 0)).toBe(0.5);
    expect(DEFAULT_THRESHOLD).toBe(0.5);
  });

  it("raises the threshold with each new false alarm", () => {
    for (const [labels, falseAlarms] of [
      [0, 0],
      [4, 1],
      [9, 4],
      [30, 2],
    ]) {
      expect(thresholdFromCounts(labels + 1, falseAlarms + 1)).toBeGreaterThan(
        thresholdFromCounts(labels, falseAlarms),
      );
    }
  });

  it("lowers the threshold with each new real label", () => {
    for (const [labels, falseAlarms] of [
      [0, 0],
      [4, 1],
      [9, 4],
      [10, 10],
    ]) {
      expect(thresholdFromCounts(labels + 1, falseAlarms)).toBeLessThan(
        thresholdFromCounts(labels, falseAlarms),
      );
    }
  });

  it("stays between 0.4 and 0.9 however lopsided the labels get", () => {
    expect(thresholdFromCounts(1000, 0)).toBeGreaterThanOrEqual(0.4);
    expect(thresholdFromCounts(1000, 1000)).toBeLessThanOrEqual(0.9);
  });
});

describe("learnedThresholds", () => {
  it("calibrates each type from the seed labels", () => {
    expect(learnedThresholds(seedLabeledEvents(now))).toEqual({
      fall: 0.58,
      fight: 0.5,
      theft: 0.5,
      fire: 0.5,
      other: 0.48,
    });
  });

  it("raises only the fight threshold after the demo's hug false alarm", () => {
    const seed = seedLabeledEvents(now);
    const before = learnedThresholds(seed);
    const after = learnedThresholds([
      ...seed,
      label({
        eventType: "fight",
        label: "false_alarm",
        description:
          "Two people wrap their arms around each other in the gym.",
      }),
    ]);
    expect(after.fight).toBe(0.54);
    expect(after.fight).toBeGreaterThan(before.fight);
    expect({ ...after, fight: before.fight }).toEqual(before);
  });

  it("counts labels from every site", () => {
    const fromStore = label({
      label: "false_alarm",
      siteId: "8a1d2e3f-4b5c-4d6e-8f70-9a1b2c3d4e5f",
      siteName: "Northside Market",
    });
    expect(learnedThresholds([fromStore]).fall).toBe(thresholdFromCounts(1, 1));
  });
});

describe("isFlagged", () => {
  it("flags at or above the threshold only", () => {
    expect(isFlagged(0.6, 0.6)).toBe(true);
    expect(isFlagged(0.59, 0.6)).toBe(false);
  });
});
