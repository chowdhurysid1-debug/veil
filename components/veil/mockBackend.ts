// In-memory stand-in for Tab B's routes. State lives for the browser session,
// so the demo path (flag, label, re-analyze, unlock, verify) works end to end
// before the real API is merged. Every value it returns is fake demo data.
import {
  DEMO_IDENTITY,
  createClipRequestSchema,
  unlockRequestSchema,
  type AuditEntry,
  type ClipDetail,
  type ClipEvent,
  type EventType,
  type FeedbackLabel,
  type LearningStats,
} from "../../lib/contracts";
import {
  MOCK_AUDIT,
  MOCK_CLIP_DETAIL,
  MOCK_FACE_SVG,
  MOCK_LEARNING_STATS,
  MOCK_SCENARIOS,
  MOCK_SEED_ORIGINAL_SHA256,
  MOCK_SITES,
  svgToDataUrl,
  type MockScenario,
} from "../../lib/mock";
import type { VeilApi } from "./api";
import { VeilApiError } from "./errors";

const DEFAULT_THRESHOLD = 0.5;
const FALSE_ALARM_STEP = 0.08;
const REAL_STEP = 0.03;
const MIN_THRESHOLD = 0.3;
const MAX_THRESHOLD = 0.9;
const UNLOCK_SECONDS = 30;

function clampThreshold(value: number) {
  return (
    Math.round(Math.min(MAX_THRESHOLD, Math.max(MIN_THRESHOLD, value)) * 100) /
    100
  );
}

/**
 * Mock version of Tab B's learning rule: a false alarm raises that type's
 * threshold, a real label lowers it. Returns a new stats object.
 */
export function applyFeedbackToStats(
  stats: LearningStats,
  input: {
    eventType: EventType;
    label: FeedbackLabel;
    siteName: string;
    createdAt: string;
    /** Calendar day (YYYY-MM-DD) the history point belongs to. */
    day: string;
  },
): LearningStats {
  const existing = stats.byType.find((row) => row.type === input.eventType);
  const previousLabels = existing?.labels ?? 0;
  const previousFalseAlarms = Math.round(
    (existing?.falseAlarmRate ?? 0) * previousLabels,
  );
  const labels = previousLabels + 1;
  const falseAlarms =
    previousFalseAlarms + (input.label === "false_alarm" ? 1 : 0);
  const step = input.label === "false_alarm" ? FALSE_ALARM_STEP : -REAL_STEP;
  const updatedRow = {
    type: input.eventType,
    labels,
    falseAlarmRate: Math.round((falseAlarms / labels) * 100) / 100,
    threshold: clampThreshold(
      (existing?.threshold ?? DEFAULT_THRESHOLD) + step,
    ),
  };
  const byType = existing
    ? stats.byType.map((row) =>
        row.type === input.eventType ? updatedRow : row,
      )
    : [...stats.byType, updatedRow];

  const totalLabels = byType.reduce((sum, row) => sum + row.labels, 0);
  const totalFalseAlarms = byType.reduce(
    (sum, row) => sum + Math.round(row.falseAlarmRate * row.labels),
    0,
  );
  const overallRate =
    totalLabels === 0
      ? 0
      : Math.round((totalFalseAlarms / totalLabels) * 100) / 100;
  const today = input.day;
  const lastPoint = stats.history.at(-1);
  const history =
    lastPoint?.date === today
      ? [
          ...stats.history.slice(0, -1),
          { date: today, falseAlarmRate: overallRate },
        ]
      : [...stats.history, { date: today, falseAlarmRate: overallRate }];

  return {
    ...stats,
    totalLabels: stats.totalLabels + 1,
    byType,
    recent: [
      {
        eventType: input.eventType,
        label: input.label,
        siteName: input.siteName,
        createdAt: input.createdAt,
      },
      ...stats.recent,
    ].slice(0, 10),
    history,
  };
}

export function thresholdFor(stats: LearningStats, type: EventType): number {
  return (
    stats.byType.find((row) => row.type === type)?.threshold ??
    DEFAULT_THRESHOLD
  );
}

interface StoredClip {
  detail: ClipDetail;
  scenario: MockScenario;
  originalSha256: string;
}

interface MockDb {
  clips: StoredClip[];
  stats: LearningStats;
  audit: AuditEntry[];
  uploads: number;
}

const db: MockDb = {
  clips: [
    {
      detail: structuredClone(MOCK_CLIP_DETAIL),
      scenario: MOCK_SCENARIOS[0],
      originalSha256: MOCK_SEED_ORIGINAL_SHA256,
    },
  ],
  stats: structuredClone(MOCK_LEARNING_STATS),
  audit: structuredClone(MOCK_AUDIT),
  uploads: 0,
};

/** YYYY-MM-DD in the viewer's time zone, matching how the officer reads "today". */
function localDay(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** The scenario the next upload gets, so the mock pipeline draws matching frames. */
function peekNextMockScenario(): MockScenario {
  return MOCK_SCENARIOS[db.uploads % MOCK_SCENARIOS.length];
}

function findClip(clipId: string): StoredClip {
  const clip = db.clips.find((stored) => stored.detail.id === clipId);
  if (!clip) {
    throw new VeilApiError(
      "We couldn't find that clip. It may have been removed.",
    );
  }
  return clip;
}

function frameMimeType(base64: string) {
  return base64.startsWith("/9j/") ? "image/jpeg" : "image/svg+xml";
}

function summarize({ detail }: StoredClip) {
  return {
    id: detail.id,
    filename: detail.filename,
    siteName: detail.siteName,
    stampedAt: detail.stampedAt,
    facesLocked: detail.facesLocked,
    eventsFlagged: detail.eventsFlagged,
  };
}

export const mockBackend: VeilApi = {
  async listClips() {
    await delay(350);
    return [...db.clips]
      .sort((a, b) => b.detail.stampedAt.localeCompare(a.detail.stampedAt))
      .map(summarize);
  },

  async getClip(clipId) {
    await delay(300);
    return structuredClone(findClip(clipId).detail);
  },

  async createClip(request) {
    await delay(700);
    const parsed = createClipRequestSchema.safeParse(request);
    if (!parsed.success) {
      throw new VeilApiError(
        "This clip didn't process correctly. Try uploading it again.",
      );
    }
    const site = MOCK_SITES.find(
      (candidate) => candidate.id === request.siteId,
    );
    const scenario = peekNextMockScenario();
    db.uploads += 1;
    const clipId = crypto.randomUUID();
    const stampedAt = new Date().toISOString();
    db.clips.push({
      scenario,
      originalSha256: request.originalSha256,
      detail: {
        id: clipId,
        filename: request.filename,
        siteName: site?.name ?? DEMO_IDENTITY.siteName,
        stampedAt,
        facesLocked: request.faces.length,
        eventsFlagged: 0,
        frames: request.frames.map((frame) => ({
          id: crypto.randomUUID(),
          frameIndex: frame.frameIndex,
          tSeconds: frame.tSeconds,
          blurredUrl: `data:${frameMimeType(frame.blurredJpegBase64)};base64,${frame.blurredJpegBase64}`,
        })),
        events: [],
        faces: request.faces.map((face) => ({
          id: crypto.randomUUID(),
          frameIndex: face.frameIndex,
          bbox: face.bbox,
        })),
      },
    });
    return {
      clipId,
      signature: `mock-hmac-${request.originalSha256.slice(0, 16)}`,
      stampedAt,
      facesLocked: request.faces.length,
      framesStored: request.frames.length,
    };
  },

  async analyzeClip(clipId) {
    await delay(1600);
    const clip = findClip(clipId);
    const lastFrameIndex = Math.max(
      0,
      ...clip.detail.frames.map((frame) => frame.frameIndex),
    );
    const { event } = clip.scenario;
    const threshold = thresholdFor(db.stats, event.type);
    const events: ClipEvent[] = [
      {
        ...event,
        frameIndex: Math.min(event.frameIndex, lastFrameIndex),
        id: crypto.randomUUID(),
        clipId,
        threshold,
        flagged: event.confidence >= threshold,
        label: null,
      },
    ];
    clip.detail.events = events;
    clip.detail.eventsFlagged = events.filter((item) => item.flagged).length;
    return {
      clipId,
      events: structuredClone(events),
      isFallback: false,
      learnedFrom: {
        labels: db.stats.totalLabels,
        sites: db.stats.sitesContributing,
      },
    };
  },

  async submitFeedback(eventId, request) {
    await delay(450);
    const clip = db.clips.find((stored) =>
      stored.detail.events.some((event) => event.id === eventId),
    );
    const event = clip?.detail.events.find((item) => item.id === eventId);
    if (!clip || !event) {
      throw new VeilApiError(
        "We couldn't find that alert. Refresh and try again.",
      );
    }
    if (event.label !== null) {
      throw new VeilApiError("This alert already has a label.");
    }
    event.label = request.label;
    db.stats = applyFeedbackToStats(db.stats, {
      eventType: event.type,
      label: request.label,
      siteName: clip.detail.siteName,
      createdAt: new Date().toISOString(),
      day: localDay(new Date()),
    });
    return {
      eventId,
      label: request.label,
      stats: structuredClone(db.stats),
    };
  },

  async getLearningStats() {
    await delay(400);
    return structuredClone(db.stats);
  },

  async unlockFace(faceId, request) {
    await delay(650);
    const parsed = unlockRequestSchema.safeParse(request);
    if (!parsed.success) {
      throw new VeilApiError(
        parsed.error.issues[0]?.message ?? "Add a reason to unlock this face.",
      );
    }
    const clip = db.clips.find((stored) =>
      stored.detail.faces.some((face) => face.id === faceId),
    );
    if (!clip) {
      throw new VeilApiError("We couldn't find that face in the vault.");
    }
    // Audit row first, key second: the same order Tab B's route must follow.
    const entry: AuditEntry = {
      id: crypto.randomUUID(),
      faceId,
      clipId: clip.detail.id,
      actor: DEMO_IDENTITY.actor,
      reasonCategory: parsed.data.reasonCategory,
      reason: parsed.data.reason,
      createdAt: new Date().toISOString(),
    };
    db.audit.unshift(entry);
    return {
      faceId,
      auditId: entry.id,
      rawKeyBase64: "bW9jay1rZXktbm90LXJlYWw=",
      ivBase64: "bW9jay1pdg==",
      ciphertextUrl: "https://example.com/mock-vault-object",
      expiresAt: new Date(Date.now() + UNLOCK_SECONDS * 1000).toISOString(),
    };
  },

  async revealFace() {
    await delay(300);
    return svgToDataUrl(MOCK_FACE_SVG);
  },

  async listAudit() {
    await delay(350);
    return structuredClone(db.audit);
  },

  async verifyClip(clipId, request) {
    await delay(600);
    const clip = findClip(clipId);
    return {
      clipId,
      status: request.sha256 === clip.originalSha256 ? "intact" : "tampered",
      stampedAt: clip.detail.stampedAt,
      stampedSha256Prefix: clip.originalSha256.slice(0, 12),
    };
  },
};
