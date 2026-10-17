import { feedbackRequestSchema, type FeedbackResponse } from "../../contracts";
import { buildLearningStats } from "../../learning/stats";
import type { VeilDeps } from "../deps";
import {
  errorResponse,
  firstIssue,
  json,
  MAX_JSON_BYTES,
  parseUuid,
  readJson,
} from "../http";

// Real or false alarm. Labeling the same event again replaces the old label, which is
// also how the UI undoes a tap: send the other label.
export async function submitFeedback(
  request: Request,
  id: string,
  deps: VeilDeps,
): Promise<Response> {
  const read = await readJson(request, MAX_JSON_BYTES);
  if (!read.ok) return read.response;
  const parsed = feedbackRequestSchema.safeParse(read.body);
  if (!parsed.success) {
    return errorResponse(400, firstIssue(parsed.error));
  }

  const eventId = parseUuid(id);
  const event = eventId ? await deps.store.getEvent(eventId) : null;
  if (!eventId || !event) {
    return errorResponse(404, "We could not find that alert.");
  }

  await deps.store.upsertFeedback({
    eventId,
    siteId: event.siteId,
    label: parsed.data.label,
    note: parsed.data.note?.trim() || null,
    createdAt: deps.now().toISOString(),
  });

  const body: FeedbackResponse = {
    eventId,
    label: parsed.data.label,
    stats: buildLearningStats(await deps.store.listLabels()),
  };
  return json(body);
}

export async function getLearningStats(deps: VeilDeps): Promise<Response> {
  return json(buildLearningStats(await deps.store.listLabels()));
}
