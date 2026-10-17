import {
  DEMO_IDENTITY,
  unlockRequestSchema,
  type UnlockResponse,
} from "../../contracts";
import type { VeilDeps } from "../deps";
import {
  errorResponse,
  json,
  MAX_JSON_BYTES,
  parseUuid,
  readJson,
} from "../http";
import { FACE_URL_TTL_SECONDS, VAULT_BUCKET } from "../storage";
import { unwrapKey } from "../vault";

export const AUDIT_LIST_LIMIT = 50;

// The audit row is written before the key is unwrapped. If the write fails, the request
// fails and no key leaves the server. Every unlock records the demo identity as the actor.
export async function unlockFace(
  request: Request,
  id: string,
  deps: VeilDeps,
): Promise<Response> {
  const read = await readJson(request, MAX_JSON_BYTES);
  if (!read.ok) return read.response;
  const parsed = unlockRequestSchema.safeParse(read.body);
  if (!parsed.success) {
    return errorResponse(
      400,
      parsed.error.issues[0]?.message ??
        "Choose a reason category and describe why you need to see this face.",
    );
  }

  const faceId = parseUuid(id);
  const face = faceId ? await deps.store.getFace(faceId) : null;
  if (!faceId || !face) {
    return errorResponse(404, "We could not find that face.");
  }

  const now = deps.now();
  const auditId = deps.newId();
  await deps.store.insertAudit({
    id: auditId,
    faceId,
    actor: DEMO_IDENTITY.actor,
    reasonCategory: parsed.data.reasonCategory,
    reason: parsed.data.reason,
    createdAt: now.toISOString(),
  });

  const rawKeyBase64 = unwrapKey(deps.vaultSecret, face.wrappedKey);
  const [ciphertextUrl] = await deps.blobs.signedUrls(
    VAULT_BUCKET,
    [face.encryptedPath],
    FACE_URL_TTL_SECONDS,
  );

  const body: UnlockResponse = {
    faceId,
    auditId,
    rawKeyBase64,
    ivBase64: face.iv,
    ciphertextUrl,
    expiresAt: new Date(
      now.getTime() + FACE_URL_TTL_SECONDS * 1000,
    ).toISOString(),
  };
  return json(body);
}

export async function listAudit(deps: VeilDeps): Promise<Response> {
  return json(await deps.store.listAudit(AUDIT_LIST_LIMIT));
}
