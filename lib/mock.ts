// Sample data matching lib/contracts.ts so the UI can be built before the API exists.
// Tab C owns this file after the initial stub. Every value here is fake demo data.
import type {
  AnalyzeResponse,
  AuditEntry,
  ClipDetail,
  ClipSummary,
  LearningStats,
  Site,
  UnlockResponse,
  VerifyResponse,
} from "./contracts";

export const MOCK_SITES: Site[] = [
  {
    id: "3f2b8c1e-5d4a-4b7e-9c1f-2a6d8e0b4c71",
    name: "Demo High School",
    kind: "school",
  },
  {
    id: "8a1d2e3f-4b5c-4d6e-8f70-9a1b2c3d4e5f",
    name: "Northside Market",
    kind: "store",
  },
];

const CLIP_ID = "5c7e9a1b-2d3f-4a5b-8c6d-7e8f9a0b1c2d";
const PLACEHOLDER_FRAME_URL =
  "https://placehold.co/640x360/18181b/71717a?text=blurred+frame";

export const MOCK_CLIPS: ClipSummary[] = [
  {
    id: CLIP_ID,
    filename: "hallway-b-1404.mp4",
    siteName: "Demo High School",
    stampedAt: "2026-10-16T21:04:00.000Z",
    facesLocked: 7,
    eventsFlagged: 1,
  },
];

export const MOCK_CLIP_DETAIL: ClipDetail = {
  ...MOCK_CLIPS[0],
  frames: Array.from({ length: 20 }, (_, index) => ({
    id: `6d8f0a2b-3c4d-4e5f-9a6b-${String(index).padStart(12, "0")}`,
    frameIndex: index,
    tSeconds: index * 1.5,
    blurredUrl: PLACEHOLDER_FRAME_URL,
  })),
  events: [
    {
      id: "7e9a1b3c-4d5e-4f6a-8b7c-8d9e0f1a2b3c",
      clipId: CLIP_ID,
      frameIndex: 9,
      type: "fall",
      confidence: 0.71,
      description: "A person goes from standing to the floor near the lockers.",
      flagged: true,
      threshold: 0.6,
      label: null,
    },
  ],
  faces: [
    {
      id: "9b1c3d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e",
      frameIndex: 9,
      bbox: { x: 0.42, y: 0.18, width: 0.08, height: 0.14 },
    },
  ],
};

export const MOCK_ANALYZE_RESPONSE: AnalyzeResponse = {
  clipId: CLIP_ID,
  events: MOCK_CLIP_DETAIL.events,
  isFallback: false,
  learnedFrom: { labels: 21, sites: 2 },
};

export const MOCK_LEARNING_STATS: LearningStats = {
  totalLabels: 21,
  sitesContributing: 2,
  byType: [
    { type: "fall", labels: 9, falseAlarmRate: 0.44, threshold: 0.6 },
    { type: "fight", labels: 5, falseAlarmRate: 0.2, threshold: 0.5 },
    { type: "theft", labels: 4, falseAlarmRate: 0.25, threshold: 0.55 },
    { type: "fire", labels: 3, falseAlarmRate: 0, threshold: 0.4 },
  ],
  recent: [
    {
      eventType: "fall",
      label: "false_alarm",
      siteName: "Northside Market",
      createdAt: "2026-10-16T20:51:00.000Z",
    },
    {
      eventType: "fight",
      label: "real",
      siteName: "Demo High School",
      createdAt: "2026-10-16T20:40:00.000Z",
    },
  ],
  history: [
    { date: "2026-10-12", falseAlarmRate: 0.52 },
    { date: "2026-10-13", falseAlarmRate: 0.47 },
    { date: "2026-10-14", falseAlarmRate: 0.41 },
    { date: "2026-10-15", falseAlarmRate: 0.36 },
    { date: "2026-10-16", falseAlarmRate: 0.31 },
  ],
};

export const MOCK_AUDIT: AuditEntry[] = [
  {
    id: "1a3b5c7d-8e9f-4a0b-9c1d-2e3f4a5b6c7d",
    faceId: MOCK_CLIP_DETAIL.faces[0].id,
    clipId: CLIP_ID,
    actor: "Safety Officer, Demo High School",
    reasonCategory: "incident_investigation",
    reason: "Identify the student who fell so the nurse can follow up.",
    createdAt: "2026-10-16T21:10:00.000Z",
  },
];

export const MOCK_UNLOCK_RESPONSE: UnlockResponse = {
  faceId: MOCK_CLIP_DETAIL.faces[0].id,
  auditId: MOCK_AUDIT[0].id,
  rawKeyBase64: "bW9jay1rZXktbm90LXJlYWw=",
  ivBase64: "bW9jay1pdg==",
  ciphertextUrl: "https://placehold.co/128x128/18181b/71717a?text=face",
  expiresAt: "2026-10-16T21:10:30.000Z",
};

export const MOCK_VERIFY_INTACT: VerifyResponse = {
  clipId: CLIP_ID,
  status: "intact",
  stampedAt: "2026-10-16T21:04:00.000Z",
  stampedSha256Prefix: "9f86d081884c",
};

export const MOCK_VERIFY_TAMPERED: VerifyResponse = {
  ...MOCK_VERIFY_INTACT,
  status: "tampered",
};
