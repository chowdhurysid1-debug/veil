import { verifyRequestSchema, type VerifyResponse } from "../../contracts";
import type { VeilDeps } from "../deps";
import {
  errorResponse,
  json,
  MAX_JSON_BYTES,
  parseUuid,
  readJson,
} from "../http";
import { isStampValid } from "../signing";

// The browser hashes the file it is given; the server compares that hash with the one it
// stamped at upload, and re-checks the stamp's HMAC so an edited database row also reads as tampered.
export async function verifyClip(
  request: Request,
  id: string,
  deps: VeilDeps,
): Promise<Response> {
  const read = await readJson(request, MAX_JSON_BYTES);
  if (!read.ok) return read.response;
  const parsed = verifyRequestSchema.safeParse(read.body);
  if (!parsed.success) {
    return errorResponse(
      400,
      "Send the file's SHA-256 hash as 64 lowercase hex characters.",
    );
  }

  const clipId = parseUuid(id);
  const clip = clipId ? await deps.store.getClip(clipId) : null;
  if (!clipId || !clip) {
    return errorResponse(404, "We could not find that clip.");
  }

  const isStampGenuine = isStampValid(
    deps.signingSecret,
    {
      clipId: clip.id,
      sha256: clip.sha256,
      capturedAt: clip.capturedAt,
      stampedAt: clip.stampedAt,
    },
    clip.signature,
  );
  const isSameFile = parsed.data.sha256 === clip.sha256;

  const body: VerifyResponse = {
    clipId,
    status: isStampGenuine && isSameFile ? "intact" : "tampered",
    stampedAt: clip.stampedAt,
    stampedSha256Prefix: clip.sha256.slice(0, 12),
  };
  return json(body);
}
