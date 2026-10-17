// Single source of truth for every shape that crosses a tab boundary.
// Owned by the integrator tab. Other tabs import from here and never redefine these shapes.
import { z } from "zod";

export const MAX_FRAMES = 20;
export const FRAME_WIDTH_PX = 640;
export const MAX_EVENTS = 10;

export const DEMO_IDENTITY = {
  actor: "Safety Officer, Demo High School",
  siteName: "Demo High School",
} as const;

// Seeded by supabase/ (Demo High School) and used as MOCK_SITES[0], so the UI can upload without a sites endpoint.
export const DEMO_SITE_ID = "3f2b8c1e-5d4a-4b7e-9c1f-2a6d8e0b4c71";

const sha256Hex = z
  .string()
  .regex(/^[a-f0-9]{64}$/, "Expected a lowercase SHA-256 hex digest.");
const base64 = z.string().min(1);

export const eventTypeSchema = z.enum([
  "fall",
  "fight",
  "theft",
  "fire",
  "other",
]);
export const feedbackLabelSchema = z.enum(["real", "false_alarm"]);
export const siteKindSchema = z.enum(["school", "store", "hospital"]);
export const unlockReasonCategorySchema = z.enum([
  "incident_investigation",
  "safety_emergency",
  "legal_request",
  "other",
]);

export const siteSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  kind: siteKindSchema,
});

// Normalized to the frame: 0..1 on both axes.
export const boundingBoxSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().min(0).max(1),
  height: z.number().min(0).max(1),
});

// ---------- Pipeline output (Tab A produces, Tab B consumes) ----------

export const processedFrameSchema = z.object({
  frameIndex: z.int().min(0),
  tSeconds: z.number().min(0),
  blurredJpegBase64: base64,
  sha256: sha256Hex,
});

export const lockedFaceSchema = z.object({
  frameIndex: z.int().min(0),
  bbox: boundingBoxSchema,
  ciphertextBase64: base64,
  ivBase64: base64,
  // Demo only: the server wraps this with VEIL_VAULT_KEY. Production would use a KMS.
  rawKeyBase64: base64,
});

export const processedClipSchema = z.object({
  filename: z.string().min(1).max(200),
  capturedAt: z.iso.datetime(),
  durationSeconds: z.number().positive(),
  originalSha256: sha256Hex,
  frames: z.array(processedFrameSchema).min(1).max(MAX_FRAMES),
  faces: z.array(lockedFaceSchema).max(500),
});

export const pipelineStepSchema = z.enum([
  "frames",
  "faces",
  "blur",
  "encrypt",
  "hash",
  "done",
]);
export const pipelineProgressSchema = z.object({
  step: pipelineStepSchema,
  progress: z.number().min(0).max(1),
  message: z.string(),
});

// ---------- AI output (Tab B, validated before use) ----------

export const detectedEventSchema = z.object({
  frameIndex: z.int().min(0),
  type: eventTypeSchema,
  confidence: z.number().min(0).max(1),
  description: z.string().min(1).max(300),
});

export const analyzeOutputSchema = z.object({
  events: z.array(detectedEventSchema).max(MAX_EVENTS),
});

// ---------- API: clips ----------

export const createClipRequestSchema = processedClipSchema.extend({
  siteId: z.uuid(),
});

export const createClipResponseSchema = z.object({
  clipId: z.uuid(),
  signature: z.string().min(1),
  // Proves to /api/clips/:id/video that this browser uploaded the clip.
  videoUploadToken: z.string().regex(/^[a-f0-9]{64}$/),
  stampedAt: z.iso.datetime(),
  facesLocked: z.int().min(0),
  framesStored: z.int().min(0),
});

export const clipEventSchema = detectedEventSchema.extend({
  id: z.uuid(),
  clipId: z.uuid(),
  flagged: z.boolean(),
  threshold: z.number().min(0).max(1),
  label: feedbackLabelSchema.nullable(),
});

export const analyzeResponseSchema = z.object({
  clipId: z.uuid(),
  events: z.array(clipEventSchema),
  isFallback: z.boolean(),
  learnedFrom: z.object({ labels: z.int().min(0), sites: z.int().min(0) }),
});

export const clipSummarySchema = z.object({
  id: z.uuid(),
  filename: z.string(),
  siteName: z.string(),
  stampedAt: z.iso.datetime(),
  facesLocked: z.int().min(0),
  eventsFlagged: z.int().min(0),
});

export const clipFrameSchema = z.object({
  id: z.uuid(),
  frameIndex: z.int().min(0),
  tSeconds: z.number().min(0),
  blurredUrl: z.url(),
});

export const lockedFaceSummarySchema = z.object({
  id: z.uuid(),
  frameIndex: z.int().min(0),
  bbox: boundingBoxSchema,
});

export const clipDetailSchema = clipSummarySchema.extend({
  frames: z.array(clipFrameSchema),
  events: z.array(clipEventSchema),
  faces: z.array(lockedFaceSummarySchema),
  // Every frame of the clip with every head blurred. Null when the browser could not render one.
  videoUrl: z.url().nullable(),
});

export const videoUploadRequestSchema = z.object({
  token: z.string().max(128),
});

// The browser PUTs the blurred MP4 it rendered straight to storage with this one-time URL.
export const videoUploadResponseSchema = z.object({ uploadUrl: z.url() });

// ---------- API: learning ----------

export const learningStatsSchema = z.object({
  totalLabels: z.int().min(0),
  sitesContributing: z.int().min(0),
  byType: z.array(
    z.object({
      type: eventTypeSchema,
      labels: z.int().min(0),
      falseAlarmRate: z.number().min(0).max(1),
      threshold: z.number().min(0).max(1),
    }),
  ),
  recent: z
    .array(
      z.object({
        eventType: eventTypeSchema,
        label: feedbackLabelSchema,
        siteName: z.string(),
        createdAt: z.iso.datetime(),
      }),
    )
    .max(10),
  history: z.array(
    z.object({ date: z.iso.date(), falseAlarmRate: z.number().min(0).max(1) }),
  ),
});

export const feedbackRequestSchema = z.object({
  label: feedbackLabelSchema,
  note: z.string().max(200).optional(),
});

export const feedbackResponseSchema = z.object({
  eventId: z.uuid(),
  label: feedbackLabelSchema,
  stats: learningStatsSchema,
});

// ---------- API: face vault ----------

export const unlockRequestSchema = z.object({
  reasonCategory: unlockReasonCategorySchema,
  reason: z
    .string()
    .trim()
    .min(
      15,
      "Describe why you need to see this face, in at least 15 characters.",
    )
    .max(500),
});

export const unlockResponseSchema = z.object({
  faceId: z.uuid(),
  auditId: z.uuid(),
  rawKeyBase64: base64,
  ivBase64: base64,
  ciphertextUrl: z.url(),
  expiresAt: z.iso.datetime(),
});

export const auditEntrySchema = z.object({
  id: z.uuid(),
  faceId: z.uuid(),
  clipId: z.uuid(),
  actor: z.string(),
  reasonCategory: unlockReasonCategorySchema,
  reason: z.string(),
  createdAt: z.iso.datetime(),
});

// ---------- API: verify ----------

// The browser hashes the file locally; the original video is never uploaded for verification.
export const verifyRequestSchema = z.object({ sha256: sha256Hex });

export const verifyResponseSchema = z.object({
  clipId: z.uuid(),
  status: z.enum(["intact", "tampered"]),
  stampedAt: z.iso.datetime(),
  stampedSha256Prefix: z.string().length(12),
});

export const apiErrorSchema = z.object({ error: z.string() });

export type EventType = z.infer<typeof eventTypeSchema>;
export type FeedbackLabel = z.infer<typeof feedbackLabelSchema>;
export type Site = z.infer<typeof siteSchema>;
export type BoundingBox = z.infer<typeof boundingBoxSchema>;
export type ProcessedFrame = z.infer<typeof processedFrameSchema>;
export type LockedFace = z.infer<typeof lockedFaceSchema>;
export type ProcessedClip = z.infer<typeof processedClipSchema>;
export type PipelineProgress = z.infer<typeof pipelineProgressSchema>;
export type DetectedEvent = z.infer<typeof detectedEventSchema>;
export type AnalyzeOutput = z.infer<typeof analyzeOutputSchema>;
export type CreateClipRequest = z.infer<typeof createClipRequestSchema>;
export type CreateClipResponse = z.infer<typeof createClipResponseSchema>;
export type ClipEvent = z.infer<typeof clipEventSchema>;
export type AnalyzeResponse = z.infer<typeof analyzeResponseSchema>;
export type ClipSummary = z.infer<typeof clipSummarySchema>;
export type ClipFrame = z.infer<typeof clipFrameSchema>;
export type ClipDetail = z.infer<typeof clipDetailSchema>;
export type VideoUploadRequest = z.infer<typeof videoUploadRequestSchema>;
export type VideoUploadResponse = z.infer<typeof videoUploadResponseSchema>;
export type LearningStats = z.infer<typeof learningStatsSchema>;
export type FeedbackRequest = z.infer<typeof feedbackRequestSchema>;
export type FeedbackResponse = z.infer<typeof feedbackResponseSchema>;
export type UnlockRequest = z.infer<typeof unlockRequestSchema>;
export type UnlockResponse = z.infer<typeof unlockResponseSchema>;
export type AuditEntry = z.infer<typeof auditEntrySchema>;
export type VerifyRequest = z.infer<typeof verifyRequestSchema>;
export type VerifyResponse = z.infer<typeof verifyResponseSchema>;
