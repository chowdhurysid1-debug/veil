import { describe, expect, it } from "vitest";

import { VeilApiError, friendlyErrorMessage } from "./errors";

describe("friendlyErrorMessage", () => {
  it("passes through copy written for the officer", () => {
    expect(friendlyErrorMessage(new VeilApiError("Clip not found."))).toBe(
      "Clip not found.",
    );
  });

  it("passes through Tab A's PipelineError copy", () => {
    const error = new Error("Video is too long (400s).");
    error.name = "PipelineError";
    expect(friendlyErrorMessage(error)).toBe("Video is too long (400s).");
  });

  it("hides raw errors behind a generic message", () => {
    const message = friendlyErrorMessage(new TypeError("x is undefined"));
    expect(message).not.toContain("undefined");
    expect(friendlyErrorMessage("boom")).toBe(message);
  });
});
