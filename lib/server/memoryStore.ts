// In-memory stand-ins for the database and storage, used by the handler tests.
// They enforce the same foreign keys and uniqueness rules as the migration.
import type { AuditEntry, ClipSummary, Site } from "../contracts";
import {
  SEED_FILENAME_PREFIX,
  SEED_LABELS,
  SEED_SITES,
  seedCreatedAt,
  seedId,
} from "../learning/seed";
import type { LabeledEvent } from "../learning/types";
import { StorageError, type BlobStore, type Bucket } from "./storage";
import type {
  ClipRecord,
  EventRecord,
  FaceRecord,
  FrameRecord,
  NewAudit,
  NewClip,
  NewEvent,
  NewFace,
  NewFeedback,
  VeilStore,
} from "./store";

export interface MemoryState {
  sites: Site[];
  clips: NewClip[];
  frames: FrameRecord[];
  faces: NewFace[];
  events: NewEvent[];
  feedback: NewFeedback[];
  audit: NewAudit[];
}

const byNewest = (a: { createdAt: string }, b: { createdAt: string }) =>
  b.createdAt.localeCompare(a.createdAt);

export function createMemoryStore(
  sites: Site[] = [...SEED_SITES],
): VeilStore & { state: MemoryState } {
  const state: MemoryState = {
    sites: [...sites],
    clips: [],
    frames: [],
    faces: [],
    events: [],
    feedback: [],
    audit: [],
  };

  const siteName = (siteId: string) =>
    state.sites.find((site) => site.id === siteId)?.name ?? "Unknown site";
  const frameIndexOf = (frameId: string) =>
    state.frames.find((frame) => frame.id === frameId)?.frameIndex ?? 0;
  const toClipRecord = (clip: NewClip): ClipRecord => ({
    ...clip,
    siteName: siteName(clip.siteId),
  });
  const toFaceRecord = (face: NewFace): FaceRecord => ({
    ...face,
    frameIndex: frameIndexOf(face.frameId),
  });
  const toEventRecord = (event: NewEvent): EventRecord => ({
    ...event,
    frameIndex: frameIndexOf(event.frameId),
    label:
      state.feedback.find((feedback) => feedback.eventId === event.id)?.label ??
      null,
  });

  return {
    state,

    async getSite(id) {
      return state.sites.find((site) => site.id === id) ?? null;
    },

    async createClip(clip, frames, faces) {
      if (!state.sites.some((site) => site.id === clip.siteId)) {
        throw new Error("clips.site_id violates foreign key");
      }
      if (state.clips.some((existing) => existing.id === clip.id)) {
        throw new Error("clips.id already exists");
      }
      const frameIds = new Set(frames.map((frame) => frame.id));
      if (faces.some((face) => !frameIds.has(face.frameId))) {
        throw new Error("face_vault.frame_id violates foreign key");
      }
      state.clips.push(clip);
      state.frames.push(...frames);
      state.faces.push(...faces);
    },

    async listClips(limit) {
      return state.clips
        .filter((clip) => !clip.filename.startsWith(SEED_FILENAME_PREFIX))
        .sort((a, b) => b.stampedAt.localeCompare(a.stampedAt))
        .slice(0, limit)
        .map((clip): ClipSummary => ({
          id: clip.id,
          filename: clip.filename,
          siteName: siteName(clip.siteId),
          stampedAt: clip.stampedAt,
          facesLocked: state.faces.filter((face) => face.clipId === clip.id)
            .length,
          eventsFlagged: state.events.filter(
            (event) => event.clipId === clip.id && event.flagged,
          ).length,
        }));
    },

    async getClip(id) {
      const clip = state.clips.find((candidate) => candidate.id === id);
      return clip ? toClipRecord(clip) : null;
    },

    async listFrames(clipId) {
      return state.frames
        .filter((frame) => frame.clipId === clipId)
        .sort((a, b) => a.frameIndex - b.frameIndex);
    },

    async listFaces(clipId) {
      return state.faces
        .filter((face) => face.clipId === clipId)
        .map(toFaceRecord)
        .sort((a, b) => a.frameIndex - b.frameIndex);
    },

    async getFace(id) {
      const face = state.faces.find((candidate) => candidate.id === id);
      return face ? toFaceRecord(face) : null;
    },

    async listEvents(clipId) {
      return state.events
        .filter((event) => event.clipId === clipId)
        .map(toEventRecord)
        .sort((a, b) => a.frameIndex - b.frameIndex);
    },

    async insertEvents(events) {
      for (const event of events) {
        if (!state.frames.some((frame) => frame.id === event.frameId)) {
          throw new Error("events.frame_id violates foreign key");
        }
      }
      state.events.push(...events);
    },

    async getEvent(id) {
      const event = state.events.find((candidate) => candidate.id === id);
      if (!event) return null;
      const clip = state.clips.find(
        (candidate) => candidate.id === event.clipId,
      );
      return { ...toEventRecord(event), siteId: clip?.siteId ?? "" };
    },

    async upsertFeedback(feedback) {
      state.feedback = state.feedback.filter(
        (existing) => existing.eventId !== feedback.eventId,
      );
      state.feedback.push(feedback);
    },

    async listLabels() {
      return state.feedback
        .flatMap((feedback): LabeledEvent[] => {
          const event = state.events.find(
            (candidate) => candidate.id === feedback.eventId,
          );
          if (!event) return [];
          return [
            {
              eventId: event.id,
              eventType: event.type,
              description: event.description,
              label: feedback.label,
              note: feedback.note,
              siteId: feedback.siteId,
              siteName: siteName(feedback.siteId),
              createdAt: feedback.createdAt,
            },
          ];
        })
        .sort(byNewest);
    },

    async insertAudit(entry) {
      if (!state.faces.some((face) => face.id === entry.faceId)) {
        throw new Error("unlock_audit.face_id violates foreign key");
      }
      state.audit.push(entry);
    },

    async listAudit(limit) {
      return [...state.audit]
        .sort(byNewest)
        .slice(0, limit)
        .map((entry): AuditEntry => ({
          id: entry.id,
          faceId: entry.faceId,
          clipId:
            state.faces.find((face) => face.id === entry.faceId)?.clipId ?? "",
          actor: entry.actor,
          reasonCategory: entry.reasonCategory,
          reason: entry.reason,
          createdAt: entry.createdAt,
        }));
    },
  };
}

// Loads the same seed rows as supabase/seed.sql.
export function seedMemoryStore(
  store: VeilStore & { state: MemoryState },
  now: Date,
) {
  SEED_SITES.forEach((site, index) => {
    store.state.clips.push({
      id: seedId("clips", index + 1),
      siteId: site.id,
      filename: `${SEED_FILENAME_PREFIX}${site.kind}.mp4`,
      sha256: "0".repeat(64),
      signature: "seed-data-not-signed",
      capturedAt: seedCreatedAt(0, 7, now),
      stampedAt: seedCreatedAt(0, 7, now),
      frameCount: 1,
    });
    store.state.frames.push({
      id: seedId("frames", index + 1),
      clipId: seedId("clips", index + 1),
      frameIndex: 0,
      tSeconds: 0,
      blurredPath: "seed-data/no-frame.jpg",
      sha256: "0".repeat(64),
    });
  });

  SEED_LABELS.forEach((seed, index) => {
    const createdAt = seedCreatedAt(index, seed.daysAgo, now);
    store.state.events.push({
      id: seedId("events", index + 1),
      clipId: seedId("clips", seed.siteIndex + 1),
      frameId: seedId("frames", seed.siteIndex + 1),
      type: seed.type,
      confidence: seed.label === "real" ? 0.8 : 0.65,
      description: seed.description,
      flagged: true,
      createdAt,
    });
    store.state.feedback.push({
      eventId: seedId("events", index + 1),
      siteId: SEED_SITES[seed.siteIndex].id,
      label: seed.label,
      note: seed.note,
      createdAt,
    });
  });
}

export function createMemoryBlobStore(): BlobStore & {
  objects: Map<string, { bytes: Uint8Array; contentType: string }>;
} {
  const objects = new Map<string, { bytes: Uint8Array; contentType: string }>();
  const key = (bucket: Bucket, path: string) => `${bucket}/${path}`;

  return {
    objects,

    async upload(bucket, path, bytes, contentType) {
      if (objects.has(key(bucket, path))) {
        throw new StorageError(`${key(bucket, path)} already exists`);
      }
      objects.set(key(bucket, path), { bytes, contentType });
    },

    async download(bucket, path) {
      const object = objects.get(key(bucket, path));
      if (!object) throw new StorageError(`${key(bucket, path)} not found`);
      return object.bytes;
    },

    async signedUrls(bucket, paths, expiresInSeconds) {
      return paths.map((path) => {
        if (!objects.has(key(bucket, path))) {
          throw new StorageError(`${key(bucket, path)} not found`);
        }
        return `https://storage.test/${bucket}/${path}?expires=${expiresInSeconds}`;
      });
    },

    async remove(bucket, paths) {
      for (const path of paths) objects.delete(key(bucket, path));
    },
  };
}
