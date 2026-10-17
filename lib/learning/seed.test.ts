import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";
import { z } from "zod";

import { buildSeedSql } from "../server/seedSql";
import {
  SEED_LABELS,
  SEED_SITES,
  seedCreatedAt,
  seedId,
  seedLabeledEvents,
} from "./seed";

describe("seed data", () => {
  it("matches the committed supabase/seed.sql", () => {
    const committed = readFileSync(resolve("supabase/seed.sql"), "utf8");
    expect(committed).toBe(buildSeedSql());
  });

  it("has about 20 labels from both sites, with both label kinds", () => {
    expect(SEED_LABELS).toHaveLength(20);
    expect(new Set(SEED_LABELS.map((seed) => seed.siteIndex)).size).toBe(2);
    expect(SEED_LABELS.some((seed) => seed.label === "false_alarm")).toBe(true);
    expect(SEED_LABELS.some((seed) => seed.label === "real")).toBe(true);
  });

  it("leaves the hug false alarm for the live demo to teach", () => {
    const text = SEED_LABELS.map(
      (seed) => `${seed.description} ${seed.note ?? ""}`,
    )
      .join(" ")
      .toLowerCase();
    // A friendly-contact false alarm here would teach the hug before the demo does.
    expect(text).not.toMatch(/hug|embrace|wrestl|laugh/);
  });

  it("has no fire labels: fire is not part of the demo", () => {
    expect(SEED_LABELS.some((seed) => seed.type === "fire")).toBe(false);
  });

  it("fits the database column limits", () => {
    for (const seed of SEED_LABELS) {
      expect(seed.description.length).toBeLessThanOrEqual(300);
      expect(seed.note?.length ?? 0).toBeLessThanOrEqual(200);
    }
  });

  it("builds valid, distinct uuids marked with the 5eed prefix", () => {
    const ids = SEED_LABELS.flatMap((_seed, index) => [
      seedId("events", index + 1),
      seedId("feedback", index + 1),
    ]);
    for (const id of ids) {
      expect(z.uuid().safeParse(id).success).toBe(true);
      expect(id.startsWith("5eed")).toBe(true);
    }
    expect(new Set(ids).size).toBe(ids.length);
    for (const site of SEED_SITES) {
      expect(z.uuid().safeParse(site.id).success).toBe(true);
    }
  });

  it("places labels at the same UTC times the SQL computes", () => {
    const now = new Date("2026-10-16T21:04:00.000Z");
    expect(seedCreatedAt(0, 6, now)).toBe("2026-10-10T09:00:00.000Z");
    expect(seedCreatedAt(9, 1, now)).toBe("2026-10-15T10:03:00.000Z");
  });

  it("produces labeled events for every seed row", () => {
    const events = seedLabeledEvents(new Date("2026-10-16T21:04:00.000Z"));
    expect(events).toHaveLength(SEED_LABELS.length);
    expect(events[0]).toMatchObject({
      eventType: "fall",
      label: "real",
      siteName: "Demo High School",
    });
  });
});
