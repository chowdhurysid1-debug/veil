import { describe, expect, it } from "vitest";

import { sniffImageType } from "./revealFace";

function bytes(...values: number[]) {
  return new Uint8Array(values).buffer;
}

describe("sniffImageType", () => {
  it("recognizes JPEG and PNG crops", () => {
    expect(sniffImageType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(sniffImageType(bytes(0x89, 0x50, 0x4e, 0x47))).toBe("image/png");
  });

  it("recognizes the mock vault's SVG", () => {
    const svg = new TextEncoder().encode('<svg xmlns="x"></svg>').buffer;
    expect(sniffImageType(svg)).toBe("image/svg+xml");
  });

  it("falls back to JPEG, the pipeline's crop format", () => {
    expect(sniffImageType(bytes(0, 1, 2, 3))).toBe("image/jpeg");
  });
});
