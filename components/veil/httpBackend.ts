// The real VeilApi: one fetch per Tab B route. Every response is parsed against
// lib/contracts.ts before a screen sees it, and every failure becomes either a
// VeilApiError with a sentence safe to show or a plain Error the UI hides.
import { z } from "zod";

import {
  analyzeResponseSchema,
  apiErrorSchema,
  auditEntrySchema,
  clipDetailSchema,
  clipSummarySchema,
  createClipResponseSchema,
  feedbackResponseSchema,
  learningStatsSchema,
  unlockResponseSchema,
  verifyResponseSchema,
  videoUploadResponseSchema,
} from "../../lib/contracts";
import type { VeilApi } from "./api";
import { VeilApiError } from "./errors";

const OFFLINE_MESSAGE =
  "We couldn't reach Veil. Check your connection and try again.";
// Vercel answers oversized bodies itself, without the route's JSON error.
const TOO_LARGE_MESSAGE =
  "This clip is too large to upload. Try a shorter clip.";
const VIDEO_UPLOAD_MESSAGE =
  "The blurred video did not upload. The blurred frames are saved.";

interface RequestOptions {
  method?: "GET" | "POST";
  body?: unknown;
}

async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  { method = "GET", body }: RequestOptions = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      cache: "no-store",
      headers:
        body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new VeilApiError(OFFLINE_MESSAGE);
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const apiError = apiErrorSchema.safeParse(payload);
    if (apiError.success) throw new VeilApiError(apiError.data.error);
    if (response.status === 413) throw new VeilApiError(TOO_LARGE_MESSAGE);
    throw new Error(`${method} ${path} answered ${response.status}.`);
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    // Paths and messages only: payloads can carry face keys.
    const issue = parsed.error.issues[0];
    throw new Error(
      `${method} ${path} broke the contract at ${issue?.path.join(".") || "the root"}: ${issue?.message}`,
    );
  }
  return parsed.data;
}

const segment = (id: string) => encodeURIComponent(id);

export const httpBackend: VeilApi = {
  listClips: () => request("/api/clips", z.array(clipSummarySchema)),

  getClip: (clipId) =>
    request(`/api/clips/${segment(clipId)}`, clipDetailSchema),

  createClip: (body) =>
    request("/api/clips", createClipResponseSchema, { method: "POST", body }),

  analyzeClip: (clipId) =>
    request(`/api/clips/${segment(clipId)}/analyze`, analyzeResponseSchema, {
      method: "POST",
    }),

  submitFeedback: (eventId, body) =>
    request(
      `/api/events/${segment(eventId)}/feedback`,
      feedbackResponseSchema,
      {
        method: "POST",
        body,
      },
    ),

  getLearningStats: () => request("/api/learning/stats", learningStatsSchema),

  unlockFace: (faceId, body) =>
    request(`/api/faces/${segment(faceId)}/unlock`, unlockResponseSchema, {
      method: "POST",
      body,
    }),

  listAudit: () => request("/api/audit", z.array(auditEntrySchema)),

  verifyClip: (clipId, body) =>
    request(`/api/clips/${segment(clipId)}/verify`, verifyResponseSchema, {
      method: "POST",
      body,
    }),

  createVideoUpload: (clipId) =>
    request(`/api/clips/${segment(clipId)}/video`, videoUploadResponseSchema, {
      method: "POST",
    }),

  uploadVideo: async (uploadUrl, video) => {
    let response: Response;
    try {
      response = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": video.type, "x-upsert": "false" },
        body: video,
      });
    } catch {
      throw new VeilApiError(OFFLINE_MESSAGE);
    }
    if (!response.ok) throw new VeilApiError(VIDEO_UPLOAD_MESSAGE);
  },
};
