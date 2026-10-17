import { describe, expect, it } from "vitest";

import {
  FALSE_ALARMS_PER_TYPE,
  MAX_EXAMPLES,
  REAL_PER_TYPE,
  selectExamples,
} from "./fewShot";
import { seedLabeledEvents } from "./seed";
import type { LabeledEvent } from "./types";

const now = new Date("2026-10-16T21:04:00.000Z");
const seed = seedLabeledEvents(now);

const shoeTie: LabeledEvent = {
  eventId: "7e9a1b3c-4d5e-4f6a-8b7c-8d9e0f1a2b3c",
  eventType: "fall",
  description: "A person goes from standing to crouching near the lockers.",
  label: "false_alarm",
  note: "Sat down to tie a shoe.",
  siteId: "3f2b8c1e-5d4a-4b7e-9c1f-2a6d8e0b4c71",
  siteName: "Demo High School",
  createdAt: now.toISOString(),
};

describe("selectExamples", () => {
  it("puts the newest false alarm for a type first", () => {
    const examples = selectExamples([...seed, shoeTie]);
    const falls = examples.filter((example) => example.eventType === "fall");
    expect(falls[0]).toMatchObject({
      label: "false_alarm",
      note: "Sat down to tie a shoe.",
    });
  });

  it("keeps at most 3 false alarms and 2 real labels per type", () => {
    const examples = selectExamples([...seed, shoeTie]);
    const falls = examples.filter((example) => example.eventType === "fall");
    expect(
      falls.filter((example) => example.label === "false_alarm"),
    ).toHaveLength(FALSE_ALARMS_PER_TYPE);
    expect(falls.filter((example) => example.label === "real")).toHaveLength(
      REAL_PER_TYPE,
    );
  });

  it("draws on every site and every labeled type", () => {
    const descriptions = new Set(
      selectExamples(seed).map((example) => example.description),
    );
    const sitesUsed = new Set(
      seed
        .filter((label) => descriptions.has(label.description))
        .map((label) => label.siteName),
    );
    expect(sitesUsed).toEqual(
      new Set(["Demo High School", "Northside Market"]),
    );
    expect(
      new Set(selectExamples(seed).map((example) => example.eventType)),
    ).toEqual(new Set(["fall", "fight", "theft", "other"]));
  });

  it("never passes ids, timestamps, or site names to the model", () => {
    for (const example of selectExamples(seed)) {
      expect(Object.keys(example).sort()).toEqual([
        "description",
        "eventType",
        "label",
        "note",
      ]);
    }
  });

  it("caps the total and handles no labels", () => {
    const many = Array.from({ length: 200 }, (_, index) => ({
      ...shoeTie,
      eventId: `id-${index}`,
      eventType: (["fall", "fight", "theft", "fire", "other"] as const)[
        index % 5
      ],
      label: index % 2 === 0 ? ("real" as const) : ("false_alarm" as const),
    }));
    expect(selectExamples(many).length).toBeLessThanOrEqual(MAX_EXAMPLES);
    expect(selectExamples([])).toEqual([]);
  });
});
