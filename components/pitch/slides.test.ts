import { describe, expect, it } from "vitest";

import { DECKS } from "./slides";

describe("pitch decks", () => {
  it("keeps the submission video cut at 2 minutes or less", () => {
    expect(DECKS.video.totalSeconds).toBeLessThanOrEqual(120);
  });

  it("covers what the judges asked the video to show", () => {
    const ids = DECKS.video.slides.map((slide) => slide.id);
    expect(ids).toEqual(
      expect.arrayContaining(["problem", "why-now", "demo", "ai"]),
    );
  });

  it("gives every slide in both cuts something to say", () => {
    for (const deck of Object.values(DECKS)) {
      for (const slide of deck.slides) {
        expect(slide.say.length).toBeGreaterThan(0);
      }
    }
  });
});
