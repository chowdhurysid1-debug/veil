import {
  createClipRequestSchema,
  type ClipDetail,
  type CreateClipRequest,
  type CreateClipResponse,
  type VideoUploadResponse,
} from "../../contracts";
import { learnedThresholds } from "../../learning/thresholds";
import { decodeBase64, isJpeg, sha256Hex } from "../bytes";
import { toClipEvent } from "../clipEvents";
import type { VeilDeps } from "../deps";
import {
  errorResponse,
  firstIssue,
  json,
  MAX_CLIP_REQUEST_BYTES,
  parseUuid,
  readJson,
  describeError,
} from "../http";
import { signStamp } from "../signing";
import {
  CIPHERTEXT_CONTENT_TYPE,
  FRAME_URL_TTL_SECONDS,
  FRAMES_BUCKET,
  framePath,
  JPEG_CONTENT_TYPE,
  mapWithConcurrency,
  VAULT_BUCKET,
  vaultPath,
  VIDEO_URL_TTL_SECONDS,
  VIDEOS_BUCKET,
  videoPath,
  type BlobStore,
  type Bucket,
} from "../storage";
import type { FrameRecord, NewFace } from "../store";
import { FACE_KEY_BYTES, wrapKey } from "../vault";

export const CLIP_LIST_LIMIT = 50;
// The blurred video is rendered right after stamping. Later uploads are refused.
export const VIDEO_UPLOAD_WINDOW_MS = 15 * 60 * 1000;
const UPLOAD_CONCURRENCY = 6;
const AES_GCM_IV_BYTES = 12;
const AES_GCM_TAG_BYTES = 16;

interface DecodedUpload {
  frames: Array<CreateClipRequest["frames"][number] & { bytes: Uint8Array }>;
  faces: Array<CreateClipRequest["faces"][number] & { ciphertext: Uint8Array }>;
}

// Checks the schema cannot express: real JPEGs, hashes that match, faces that point at real frames.
function decodeUpload(
  input: CreateClipRequest,
): { ok: true; upload: DecodedUpload } | { ok: false; message: string } {
  const frameIndexes = new Set(input.frames.map((frame) => frame.frameIndex));
  if (frameIndexes.size !== input.frames.length) {
    return { ok: false, message: "Each frame needs its own frameIndex." };
  }

  const frames: DecodedUpload["frames"] = [];
  for (const frame of input.frames) {
    const bytes = decodeBase64(frame.blurredJpegBase64);
    if (!bytes || !isJpeg(bytes)) {
      return {
        ok: false,
        message: `Frame ${frame.frameIndex} is not a JPEG image.`,
      };
    }
    if (sha256Hex(bytes) !== frame.sha256) {
      return {
        ok: false,
        message: `Frame ${frame.frameIndex} does not match its SHA-256 hash.`,
      };
    }
    frames.push({ ...frame, bytes });
  }

  const faces: DecodedUpload["faces"] = [];
  for (const face of input.faces) {
    if (!frameIndexes.has(face.frameIndex)) {
      return {
        ok: false,
        message: `A locked face points at frame ${face.frameIndex}, which is not in this upload.`,
      };
    }
    const ciphertext = decodeBase64(face.ciphertextBase64);
    const iv = decodeBase64(face.ivBase64);
    const rawKey = decodeBase64(face.rawKeyBase64);
    if (!ciphertext || ciphertext.length <= AES_GCM_TAG_BYTES) {
      return {
        ok: false,
        message: "A locked face has no readable ciphertext.",
      };
    }
    if (!iv || iv.length !== AES_GCM_IV_BYTES) {
      return { ok: false, message: "A locked face has an invalid IV." };
    }
    if (!rawKey || rawKey.length !== FACE_KEY_BYTES) {
      return {
        ok: false,
        message: "A locked face key must be a 256-bit AES key.",
      };
    }
    faces.push({ ...face, ciphertext });
  }

  return { ok: true, upload: { frames, faces } };
}

interface Upload {
  bucket: Bucket;
  path: string;
  bytes: Uint8Array;
  contentType: string;
}

async function removeUploaded(blobs: BlobStore, uploaded: Upload[]) {
  for (const bucket of [FRAMES_BUCKET, VAULT_BUCKET] as const) {
    const paths = uploaded
      .filter((upload) => upload.bucket === bucket)
      .map((upload) => upload.path);
    try {
      await blobs.remove(bucket, paths);
    } catch (error) {
      console.error(
        `[createClip] cleanup left ${paths.length} orphaned ${bucket} objects. ${describeError(error)}`,
      );
    }
  }
}

export async function createClip(
  request: Request,
  deps: VeilDeps,
): Promise<Response> {
  const read = await readJson(
    request,
    MAX_CLIP_REQUEST_BYTES,
    "This clip is too large to upload. Try a shorter clip.",
  );
  if (!read.ok) return read.response;

  const parsed = createClipRequestSchema.safeParse(read.body);
  if (!parsed.success) {
    return errorResponse(
      400,
      `This upload is not valid. ${firstIssue(parsed.error)}`,
    );
  }
  const input = parsed.data;

  const decoded = decodeUpload(input);
  if (!decoded.ok) return errorResponse(400, decoded.message);

  const site = await deps.store.getSite(input.siteId);
  if (!site) return errorResponse(404, "That site does not exist.");

  const clipId = deps.newId();
  const stampedAt = deps.now().toISOString();
  const signature = signStamp(deps.signingSecret, {
    clipId,
    sha256: input.originalSha256,
    capturedAt: input.capturedAt,
    stampedAt,
  });

  const uploads: Upload[] = [];
  const frames: FrameRecord[] = decoded.upload.frames.map((frame) => {
    const path = framePath(clipId, frame.frameIndex);
    uploads.push({
      bucket: FRAMES_BUCKET,
      path,
      bytes: frame.bytes,
      contentType: JPEG_CONTENT_TYPE,
    });
    return {
      id: deps.newId(),
      clipId,
      frameIndex: frame.frameIndex,
      tSeconds: frame.tSeconds,
      blurredPath: path,
      sha256: frame.sha256,
    };
  });

  const frameIdByIndex = new Map(
    frames.map((frame) => [frame.frameIndex, frame.id]),
  );
  const faces: NewFace[] = decoded.upload.faces.map((face) => {
    const id = deps.newId();
    const path = vaultPath(clipId, id);
    uploads.push({
      bucket: VAULT_BUCKET,
      path,
      bytes: face.ciphertext,
      contentType: CIPHERTEXT_CONTENT_TYPE,
    });
    return {
      id,
      clipId,
      frameId: frameIdByIndex.get(face.frameIndex) ?? "",
      encryptedPath: path,
      wrappedKey: wrapKey(deps.vaultSecret, face.rawKeyBase64),
      iv: face.ivBase64,
      bbox: face.bbox,
    };
  });

  const uploaded: Upload[] = [];
  try {
    await mapWithConcurrency(uploads, UPLOAD_CONCURRENCY, async (upload) => {
      await deps.blobs.upload(
        upload.bucket,
        upload.path,
        upload.bytes,
        upload.contentType,
      );
      uploaded.push(upload);
    });
    await deps.store.createClip(
      {
        id: clipId,
        siteId: site.id,
        filename: input.filename,
        sha256: input.originalSha256,
        signature,
        capturedAt: input.capturedAt,
        stampedAt,
        frameCount: frames.length,
      },
      frames,
      faces,
    );
  } catch (error) {
    await removeUploaded(deps.blobs, uploaded);
    throw error;
  }

  const body: CreateClipResponse = {
    clipId,
    signature,
    stampedAt,
    facesLocked: faces.length,
    framesStored: frames.length,
  };
  return json(body, 201);
}

export async function listClips(deps: VeilDeps): Promise<Response> {
  return json(await deps.store.listClips(CLIP_LIST_LIMIT));
}

// Blurred frames as short-lived signed URLs, events with their labels, and face boxes.
// Face keys and ciphertext paths never leave the server here; only an unlock returns them.
export async function getClipDetail(
  id: string,
  deps: VeilDeps,
): Promise<Response> {
  const clipId = parseUuid(id);
  const clip = clipId ? await deps.store.getClip(clipId) : null;
  if (!clipId || !clip) {
    return errorResponse(404, "We could not find that clip.");
  }

  const [frames, events, faces, labels, videoUrl] = await Promise.all([
    deps.store.listFrames(clipId),
    deps.store.listEvents(clipId),
    deps.store.listFaces(clipId),
    deps.store.listLabels(),
    deps.blobs.signedUrlIfExists(
      VIDEOS_BUCKET,
      videoPath(clipId),
      VIDEO_URL_TTL_SECONDS,
    ),
  ]);
  const urls = await deps.blobs.signedUrls(
    FRAMES_BUCKET,
    frames.map((frame) => frame.blurredPath),
    FRAME_URL_TTL_SECONDS,
  );
  const thresholds = learnedThresholds(labels);

  const body: ClipDetail = {
    id: clip.id,
    filename: clip.filename,
    siteName: clip.siteName,
    stampedAt: clip.stampedAt,
    facesLocked: faces.length,
    eventsFlagged: events.filter((event) => event.flagged).length,
    frames: frames.map((frame, index) => ({
      id: frame.id,
      frameIndex: frame.frameIndex,
      tSeconds: frame.tSeconds,
      blurredUrl: urls[index],
    })),
    events: events.map((event) => toClipEvent(event, thresholds)),
    faces: faces.map((face) => ({
      id: face.id,
      frameIndex: face.frameIndex,
      bbox: face.bbox,
    })),
    videoUrl,
  };
  return json(body);
}

// A one-time upload URL for the clip's blurred video. The browser renders it
// from the original file, so the original never reaches the server.
export async function createVideoUpload(
  id: string,
  deps: VeilDeps,
): Promise<Response> {
  const clipId = parseUuid(id);
  const clip = clipId ? await deps.store.getClip(clipId) : null;
  if (!clipId || !clip) {
    return errorResponse(404, "We could not find that clip.");
  }

  const age = deps.now().getTime() - new Date(clip.stampedAt).getTime();
  if (age > VIDEO_UPLOAD_WINDOW_MS) {
    return errorResponse(
      409,
      "This clip was stamped too long ago to add a video. Upload it again.",
    );
  }

  const existing = await deps.blobs.signedUrlIfExists(
    VIDEOS_BUCKET,
    videoPath(clipId),
    VIDEO_URL_TTL_SECONDS,
  );
  if (existing) {
    return errorResponse(409, "This clip already has its blurred video.");
  }

  const body: VideoUploadResponse = {
    uploadUrl: await deps.blobs.signedUploadUrl(
      VIDEOS_BUCKET,
      videoPath(clipId),
    ),
  };
  return json(body, 201);
}
