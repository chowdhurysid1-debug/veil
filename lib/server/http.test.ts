import { describe, expect, it } from "vitest";

import { readJson } from "./http";

function streamRequest(chunks: string[], headers: Record<string, string> = {}) {
  const encoder = new TextEncoder();
  let pulled = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (pulled < chunks.length) {
        controller.enqueue(encoder.encode(chunks[pulled]));
        pulled += 1;
      } else {
        controller.close();
      }
    },
  });
  const request = new Request("http://localhost/api/test", {
    method: "POST",
    headers,
    body,
    duplex: "half",
  } as RequestInit);
  return { request, pulledCount: () => pulled };
}

describe("readJson", () => {
  it("parses a small JSON body", async () => {
    const { request } = streamRequest(['{"a":', "1}"]);
    expect(await readJson(request, 100)).toEqual({ ok: true, body: { a: 1 } });
  });

  it("stops reading once the body passes the limit", async () => {
    const chunk = "a".repeat(40);
    const { request, pulledCount } = streamRequest(Array(10).fill(chunk));
    const result = await readJson(request, 100);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(413);
    expect(pulledCount()).toBeLessThan(10);
  });

  it("rejects a declared length over the limit before reading", async () => {
    const { request } = streamRequest(["{}"], { "content-length": "101" });
    const result = await readJson(request, 100);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(413);
    expect(request.bodyUsed).toBe(false);
  });

  it("rejects a malformed Content-Length", async () => {
    const { request } = streamRequest(["{}"], { "content-length": "12abc" });
    const result = await readJson(request, 100);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(400);
  });
});
