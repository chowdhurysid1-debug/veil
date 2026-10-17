// The data layer the route handlers depend on. supabaseStore.ts is the real one;
// memoryStore.ts backs the tests. Records are camelCase; the SQL columns are snake_case.
import type {
  AuditEntry,
  BoundingBox,
  ClipSummary,
  EventType,
  FeedbackLabel,
  Site,
  UnlockRequest,
} from "../contracts";
import type { LabeledEvent } from "../learning/types";

export interface ClipRecord {
  id: string;
  siteId: string;
  siteName: string;
  filename: string;
  sha256: string;
  signature: string;
  capturedAt: string;
  stampedAt: string;
  frameCount: number;
}

export type NewClip = Omit<ClipRecord, "siteName">;

export interface FrameRecord {
  id: string;
  clipId: string;
  frameIndex: number;
  tSeconds: number;
  blurredPath: string;
  sha256: string;
}

export interface FaceRecord {
  id: string;
  clipId: string;
  frameId: string;
  frameIndex: number;
  encryptedPath: string;
  wrappedKey: string;
  iv: string;
  bbox: BoundingBox;
}

export type NewFace = Omit<FaceRecord, "frameIndex">;

export interface EventRecord {
  id: string;
  clipId: string;
  frameId: string;
  frameIndex: number;
  type: EventType;
  confidence: number;
  description: string;
  flagged: boolean;
  createdAt: string;
  label: FeedbackLabel | null;
}

export type NewEvent = Omit<EventRecord, "frameIndex" | "label">;

export interface NewFeedback {
  eventId: string;
  siteId: string;
  label: FeedbackLabel;
  note: string | null;
  createdAt: string;
}

export interface NewAudit {
  id: string;
  faceId: string;
  actor: string;
  reasonCategory: UnlockRequest["reasonCategory"];
  reason: string;
  createdAt: string;
}

export interface VeilStore {
  getSite(id: string): Promise<Site | null>;
  // All rows or none.
  createClip(
    clip: NewClip,
    frames: FrameRecord[],
    faces: NewFace[],
  ): Promise<void>;
  // Newest first. Seed clips are left out.
  listClips(limit: number): Promise<ClipSummary[]>;
  getClip(id: string): Promise<ClipRecord | null>;
  listFrames(clipId: string): Promise<FrameRecord[]>;
  listFaces(clipId: string): Promise<FaceRecord[]>;
  getFace(id: string): Promise<FaceRecord | null>;
  listEvents(clipId: string): Promise<EventRecord[]>;
  insertEvents(events: NewEvent[]): Promise<void>;
  getEvent(id: string): Promise<(EventRecord & { siteId: string }) | null>;
  // One label per event. Labeling again replaces the old label.
  upsertFeedback(feedback: NewFeedback): Promise<void>;
  // Every label across every site, newest first.
  listLabels(): Promise<LabeledEvent[]>;
  insertAudit(entry: NewAudit): Promise<void>;
  // Newest first.
  listAudit(limit: number): Promise<AuditEntry[]>;
}
