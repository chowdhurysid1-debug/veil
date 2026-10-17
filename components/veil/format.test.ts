import { describe, expect, it } from "vitest";

import {
  formatClipTime,
  formatDay,
  formatConfidence,
  formatPercent,
  isThresholdShown,
  pluralize,
  timelinePosition,
} from "./format";

describe("isThresholdShown", () => {
  it("hides fire until someone has labeled a fire", () => {
    expect(isThresholdShown({ type: "fire", labels: 0 })).toBe(false);
    expect(isThresholdShown({ type: "fire", labels: 1 })).toBe(true);
  });

  it("always shows the demo's types, even with no labels", () => {
    expect(isThresholdShown({ type: "other", labels: 0 })).toBe(true);
    expect(isThresholdShown({ type: "fight", labels: 0 })).toBe(true);
  });
});

describe("formatClipTime", () => {
  it("rounds to the nearest second", () => {
    expect(formatClipTime(13.5)).toBe("0:14");
    expect(formatClipTime(0)).toBe("0:00");
  });

  it("rolls over into minutes", () => {
    expect(formatClipTime(75)).toBe("1:15");
  });

  it("never shows a negative offset", () => {
    expect(formatClipTime(-3)).toBe("0:00");
  });
});

describe("formatConfidence and formatPercent", () => {
  it("matches the spec's two-decimal confidence", () => {
    expect(formatConfidence(0.71)).toBe("0.71");
    expect(formatConfidence(0.7149)).toBe("0.71");
  });

  it("rounds rates to whole percents", () => {
    expect(formatPercent(0.4444)).toBe("44%");
    expect(formatPercent(0)).toBe("0%");
  });
});

describe("pluralize", () => {
  it("uses the singular for one", () => {
    expect(pluralize(1, "label")).toBe("1 label");
    expect(pluralize(7, "face")).toBe("7 faces");
    expect(pluralize(2, "person", "people")).toBe("2 people");
  });
});

describe("timelinePosition", () => {
  it("places frames proportionally and clamps", () => {
    expect(timelinePosition(13.5, 27)).toBe(0.5);
    expect(timelinePosition(40, 27)).toBe(1);
    expect(timelinePosition(5, 0)).toBe(0);
  });
});

describe("formatDay", () => {
  it("formats a calendar day without shifting it across time zones", () => {
    expect(formatDay("2026-10-16")).toBe("Oct 16");
    expect(formatDay("2026-01-01")).toBe("Jan 1");
  });
});
