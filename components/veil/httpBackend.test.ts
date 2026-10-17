import { afterEach, describe, expect, it, vi } from "vitest";

import { MOCK_CLIPS, MOCK_VERIFY_INTACT } from "../../lib/mock";
import { VeilApiError, friendlyErrorMessage } from "./errors";
import { httpBackend } from "./httpBackend";

function stubFetch(response: Response | Error) {
  const fetchMock = vi.fn(async () => {
    if (response instanceof Error) throw response;
    return response;
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("httpBackend", () => {
  it("returns a response that matches the contract", async () => {
    stubFetch(jsonResponse(MOCK_CLIPS));
    await expect(httpBackend.listClips()).resolves.toEqual(MOCK_CLIPS);
  });

  it("posts JSON bodies to the route for that id", async () => {
    const fetchMock = stubFetch(jsonResponse(MOCK_VERIFY_INTACT));
    const clipId = MOCK_VERIFY_INTACT.clipId;
    await httpBackend.verifyClip(clipId, { sha256: "a".repeat(64) });

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/clips/${clipId}/verify`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ sha256: "a".repeat(64) }),
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  it("shows the server's error sentence as is", async () => {
    stubFetch(jsonResponse({ error: "We couldn't find that clip." }, 404));
    const failure = httpBackend.getClip(MOCK_CLIPS[0].id);
    await expect(failure).rejects.toBeInstanceOf(VeilApiError);
    await expect(failure).rejects.toThrow("We couldn't find that clip.");
  });

  it("explains an oversized upload that Vercel rejects without JSON", async () => {
    stubFetch(new Response("Request Entity Too Large", { status: 413 }));
    await expect(httpBackend.listAudit()).rejects.toThrow(
      "This clip is too large to upload. Try a shorter clip.",
    );
  });

  it("says the network is down when fetch itself fails", async () => {
    stubFetch(new TypeError("Failed to fetch"));
    await expect(httpBackend.getLearningStats()).rejects.toThrow(
      "We couldn't reach Veil. Check your connection and try again.",
    );
  });

  it("hides a response that breaks the contract behind the generic message", async () => {
    stubFetch(jsonResponse([{ id: "not-a-uuid" }]));
    const error = await httpBackend.listClips().catch((caught) => caught);
    expect(error).not.toBeInstanceOf(VeilApiError);
    expect(friendlyErrorMessage(error)).toBe(
      "Something went wrong on our side. Try again in a moment.",
    );
  });

  it("hides an error page that is not JSON", async () => {
    stubFetch(new Response("<html>Bad gateway</html>", { status: 502 }));
    const error = await httpBackend.listClips().catch((caught) => caught);
    expect(error).not.toBeInstanceOf(VeilApiError);
  });

  it("PUTs the blurred video to the signed URL without overwriting", async () => {
    const fetchMock = stubFetch(new Response("{}", { status: 200 }));
    const video = new Blob([new Uint8Array([0, 0, 0, 24])], {
      type: "video/mp4",
    });
    await httpBackend.uploadVideo("https://storage.test/upload?token=t", video);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://storage.test/upload?token=t",
      expect.objectContaining({
        method: "PUT",
        headers: { "Content-Type": "video/mp4", "x-upsert": "false" },
        body: video,
      }),
    );
  });

  it("says the frames are safe when the video upload is refused", async () => {
    stubFetch(new Response("{}", { status: 400 }));
    await expect(
      httpBackend.uploadVideo(
        "https://storage.test/upload?token=t",
        new Blob([], { type: "video/mp4" }),
      ),
    ).rejects.toThrow(
      "The blurred video did not upload. The blurred frames are saved.",
    );
  });
});
