import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import {
  boundingBoxSchema,
  eventTypeSchema,
  feedbackLabelSchema,
  siteKindSchema,
  unlockReasonCategorySchema,
  type ClipSummary,
} from "../contracts";
import { SEED_FILENAME_PREFIX } from "../learning/seed";
import type { LabeledEvent } from "../learning/types";
import type { EventRecord, FaceRecord, VeilStore } from "./store";

export class StoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StoreError";
  }
}

// Postgres returns "2026-10-16 21:04:00.123+00"-style values; the contracts want ISO with Z.
const timestamp = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), "Invalid timestamp")
  .transform((value) => new Date(value).toISOString());
const numeric = z.coerce.number();

// PostgREST embeds a one-to-one relation as an object, older versions as a one-item array.
function oneOrNone<T extends z.ZodType>(schema: T) {
  return z
    .union([schema, z.array(schema)])
    .nullable()
    .transform((value) => (Array.isArray(value) ? (value[0] ?? null) : value));
}

const siteRow = z.object({
  id: z.string(),
  name: z.string(),
  kind: siteKindSchema,
});

const clipRow = z.object({
  id: z.string(),
  site_id: z.string(),
  filename: z.string(),
  sha256: z.string(),
  signature: z.string(),
  captured_at: timestamp,
  frame_count: numeric,
  created_at: timestamp,
  sites: oneOrNone(z.object({ name: z.string() })),
});

const clipSummaryRow = z.object({
  id: z.string(),
  filename: z.string(),
  created_at: timestamp,
  sites: oneOrNone(z.object({ name: z.string() })),
  face_vault: z.array(z.object({ id: z.string() })),
  events: z.array(z.object({ flagged: z.boolean() })),
});

const frameRow = z.object({
  id: z.string(),
  clip_id: z.string(),
  frame_index: numeric,
  t_seconds: numeric,
  blurred_path: z.string(),
  sha256: z.string(),
});

const faceRow = z.object({
  id: z.string(),
  clip_id: z.string(),
  frame_id: z.string(),
  encrypted_path: z.string(),
  wrapped_key: z.string(),
  iv: z.string(),
  bbox: boundingBoxSchema,
  frames: oneOrNone(z.object({ frame_index: numeric })),
});

const eventRow = z.object({
  id: z.string(),
  clip_id: z.string(),
  frame_id: z.string(),
  type: eventTypeSchema,
  confidence: numeric,
  description: z.string(),
  flagged: z.boolean(),
  created_at: timestamp,
  frames: oneOrNone(z.object({ frame_index: numeric })),
  feedback: oneOrNone(z.object({ label: feedbackLabelSchema })),
});

const eventWithSiteRow = eventRow.extend({
  clips: oneOrNone(z.object({ site_id: z.string() })),
});

const labelRow = z.object({
  event_id: z.string(),
  label: feedbackLabelSchema,
  note: z.string().nullable(),
  site_id: z.string(),
  created_at: timestamp,
  sites: oneOrNone(z.object({ name: z.string() })),
  events: oneOrNone(
    z.object({ type: eventTypeSchema, description: z.string() }),
  ),
});

const auditRow = z.object({
  id: z.string(),
  face_id: z.string(),
  actor: z.string(),
  reason_category: unlockReasonCategorySchema,
  reason: z.string(),
  created_at: timestamp,
  face_vault: oneOrNone(z.object({ clip_id: z.string() })),
});

const CLIP_COLUMNS =
  "id, site_id, filename, sha256, signature, captured_at, frame_count, created_at, sites(name)";
const FRAME_COLUMNS =
  "id, clip_id, frame_index, t_seconds, blurred_path, sha256";
const FACE_COLUMNS =
  "id, clip_id, frame_id, encrypted_path, wrapped_key, iv, bbox, frames(frame_index)";
const EVENT_COLUMNS =
  "id, clip_id, frame_id, type, confidence, description, flagged, created_at, frames(frame_index), feedback(label)";
const MAX_LABELS = 1000;

interface QueryResult {
  data: unknown;
  error: { message: string } | null;
}

function check(operation: string, { data, error }: QueryResult): unknown {
  if (error) throw new StoreError(`${operation} failed: ${error.message}`);
  return data;
}

function parse<T extends z.ZodType>(
  operation: string,
  schema: T,
  data: unknown,
): z.infer<T> {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new StoreError(
      `${operation} returned an unexpected shape at ${issue?.path.join(".") || "root"}: ${issue?.message ?? "unknown"}`,
    );
  }
  return parsed.data;
}

function toFace(row: z.infer<typeof faceRow>): FaceRecord {
  return {
    id: row.id,
    clipId: row.clip_id,
    frameId: row.frame_id,
    frameIndex: row.frames?.frame_index ?? 0,
    encryptedPath: row.encrypted_path,
    wrappedKey: row.wrapped_key,
    iv: row.iv,
    bbox: row.bbox,
  };
}

function toEvent(row: z.infer<typeof eventRow>): EventRecord {
  return {
    id: row.id,
    clipId: row.clip_id,
    frameId: row.frame_id,
    frameIndex: row.frames?.frame_index ?? 0,
    type: row.type,
    confidence: row.confidence,
    description: row.description,
    flagged: row.flagged,
    createdAt: row.created_at,
    label: row.feedback?.label ?? null,
  };
}

export function createSupabaseStore(client: SupabaseClient): VeilStore {
  return {
    async getSite(id) {
      const op = "getSite";
      const data = check(
        op,
        await client
          .from("sites")
          .select("id, name, kind")
          .eq("id", id)
          .maybeSingle(),
      );
      return parse(op, siteRow.nullable(), data);
    },

    async createClip(clip, frames, faces) {
      check(
        "createClip",
        await client.rpc("create_clip", {
          p_clip: {
            id: clip.id,
            site_id: clip.siteId,
            filename: clip.filename,
            sha256: clip.sha256,
            signature: clip.signature,
            captured_at: clip.capturedAt,
            frame_count: clip.frameCount,
            created_at: clip.stampedAt,
          },
          p_frames: frames.map((frame) => ({
            id: frame.id,
            clip_id: frame.clipId,
            frame_index: frame.frameIndex,
            t_seconds: frame.tSeconds,
            blurred_path: frame.blurredPath,
            sha256: frame.sha256,
          })),
          p_faces: faces.map((face) => ({
            id: face.id,
            clip_id: face.clipId,
            frame_id: face.frameId,
            encrypted_path: face.encryptedPath,
            wrapped_key: face.wrappedKey,
            iv: face.iv,
            bbox: face.bbox,
          })),
        }),
      );
    },

    async listClips(limit) {
      const op = "listClips";
      const data = check(
        op,
        await client
          .from("clips")
          .select(
            "id, filename, created_at, sites(name), face_vault(id), events(flagged)",
          )
          .not("filename", "like", `${SEED_FILENAME_PREFIX}%`)
          .order("created_at", { ascending: false })
          .limit(limit),
      );
      return parse(op, z.array(clipSummaryRow), data).map(
        (row): ClipSummary => ({
          id: row.id,
          filename: row.filename,
          siteName: row.sites?.name ?? "Unknown site",
          stampedAt: row.created_at,
          facesLocked: row.face_vault.length,
          eventsFlagged: row.events.filter((event) => event.flagged).length,
        }),
      );
    },

    async getClip(id) {
      const op = "getClip";
      const data = check(
        op,
        await client
          .from("clips")
          .select(CLIP_COLUMNS)
          .eq("id", id)
          .maybeSingle(),
      );
      const row = parse(op, clipRow.nullable(), data);
      if (!row) return null;
      return {
        id: row.id,
        siteId: row.site_id,
        siteName: row.sites?.name ?? "Unknown site",
        filename: row.filename,
        sha256: row.sha256,
        signature: row.signature,
        capturedAt: row.captured_at,
        stampedAt: row.created_at,
        frameCount: row.frame_count,
      };
    },

    async listFrames(clipId) {
      const op = "listFrames";
      const data = check(
        op,
        await client
          .from("frames")
          .select(FRAME_COLUMNS)
          .eq("clip_id", clipId)
          .order("frame_index"),
      );
      return parse(op, z.array(frameRow), data).map((row) => ({
        id: row.id,
        clipId: row.clip_id,
        frameIndex: row.frame_index,
        tSeconds: row.t_seconds,
        blurredPath: row.blurred_path,
        sha256: row.sha256,
      }));
    },

    async listFaces(clipId) {
      const op = "listFaces";
      const data = check(
        op,
        await client
          .from("face_vault")
          .select(FACE_COLUMNS)
          .eq("clip_id", clipId),
      );
      return parse(op, z.array(faceRow), data)
        .map(toFace)
        .sort((a, b) => a.frameIndex - b.frameIndex);
    },

    async getFace(id) {
      const op = "getFace";
      const data = check(
        op,
        await client
          .from("face_vault")
          .select(FACE_COLUMNS)
          .eq("id", id)
          .maybeSingle(),
      );
      const row = parse(op, faceRow.nullable(), data);
      return row ? toFace(row) : null;
    },

    async listEvents(clipId) {
      const op = "listEvents";
      const data = check(
        op,
        await client.from("events").select(EVENT_COLUMNS).eq("clip_id", clipId),
      );
      return parse(op, z.array(eventRow), data)
        .map(toEvent)
        .sort((a, b) => a.frameIndex - b.frameIndex);
    },

    async insertEvents(events) {
      if (events.length === 0) return;
      check(
        "insertEvents",
        await client.from("events").insert(
          events.map((event) => ({
            id: event.id,
            clip_id: event.clipId,
            frame_id: event.frameId,
            type: event.type,
            confidence: event.confidence,
            description: event.description,
            flagged: event.flagged,
            created_at: event.createdAt,
          })),
        ),
      );
    },

    async getEvent(id) {
      const op = "getEvent";
      const data = check(
        op,
        await client
          .from("events")
          .select(`${EVENT_COLUMNS}, clips(site_id)`)
          .eq("id", id)
          .maybeSingle(),
      );
      const row = parse(op, eventWithSiteRow.nullable(), data);
      if (!row) return null;
      return { ...toEvent(row), siteId: row.clips?.site_id ?? "" };
    },

    async upsertFeedback(feedback) {
      check(
        "upsertFeedback",
        await client.from("feedback").upsert(
          {
            event_id: feedback.eventId,
            site_id: feedback.siteId,
            label: feedback.label,
            note: feedback.note,
            created_at: feedback.createdAt,
          },
          { onConflict: "event_id" },
        ),
      );
    },

    async listLabels() {
      const op = "listLabels";
      const data = check(
        op,
        await client
          .from("feedback")
          .select(
            "event_id, label, note, site_id, created_at, sites(name), events(type, description)",
          )
          .order("created_at", { ascending: false })
          .limit(MAX_LABELS),
      );
      return parse(op, z.array(labelRow), data).flatMap(
        (row): LabeledEvent[] =>
          row.events
            ? [
                {
                  eventId: row.event_id,
                  eventType: row.events.type,
                  description: row.events.description,
                  label: row.label,
                  note: row.note,
                  siteId: row.site_id,
                  siteName: row.sites?.name ?? "Unknown site",
                  createdAt: row.created_at,
                },
              ]
            : [],
      );
    },

    async insertAudit(entry) {
      check(
        "insertAudit",
        await client.from("unlock_audit").insert({
          id: entry.id,
          face_id: entry.faceId,
          actor: entry.actor,
          reason_category: entry.reasonCategory,
          reason: entry.reason,
          created_at: entry.createdAt,
        }),
      );
    },

    async listAudit(limit) {
      const op = "listAudit";
      const data = check(
        op,
        await client
          .from("unlock_audit")
          .select(
            "id, face_id, actor, reason_category, reason, created_at, face_vault(clip_id)",
          )
          .order("created_at", { ascending: false })
          .limit(limit),
      );
      return parse(op, z.array(auditRow), data).map((row) => ({
        id: row.id,
        faceId: row.face_id,
        clipId: row.face_vault?.clip_id ?? "",
        actor: row.actor,
        reasonCategory: row.reason_category,
        reason: row.reason,
        createdAt: row.created_at,
      }));
    },
  };
}
