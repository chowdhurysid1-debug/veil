import { DAILY_ANALYZE_CAP } from "../../ai";
import type { AnalyzeResponse, ClipEvent } from "../../contracts";
import { summarizeLabels } from "../../learning/stats";
import { uniformThresholds } from "../../learning/thresholds";
import { toClipEvent } from "../clipEvents";
import type { VeilDeps } from "../deps";
import { describeError, errorResponse, json, parseUuid } from "../http";
import { FRAMES_BUCKET, mapWithConcurrency } from "../storage";
import type { EventRecord } from "../store";

const DOWNLOAD_CONCURRENCY = 6;

export async function analyzeClip(
  id: string,
  deps: VeilDeps,
): Promise<Response> {
  const clipId = parseUuid(id);
  const clip = clipId ? await deps.store.getClip(clipId) : null;
  if (!clipId || !clip) {
    return errorResponse(404, "We could not find that clip.");
  }

  const [existing, labels] = await Promise.all([
    deps.store.listEvents(clipId),
    deps.store.listLabels(),
  ]);
  const thresholds = uniformThresholds();
  const respond = (events: ClipEvent[], isFallback: boolean) => {
    const body: AnalyzeResponse = {
      clipId,
      events,
      isFallback,
      learnedFrom: summarizeLabels(labels),
    };
    return json(body);
  };
  // Matches ANALYZE_FALLBACK: no events, so the UI shows "Analysis unavailable, review manually".
  const fallback = () => respond([], true);

  // Already analyzed: return the stored result instead of paying for a second call.
  if (existing.length > 0) {
    return respond(
      existing.map((event) => toClipEvent(event, thresholds)),
      false,
    );
  }

  if (!deps.analyzeCap.tryConsume()) {
    console.warn(
      `[analyzeClip] daily cap of ${DAILY_ANALYZE_CAP} analyses reached, returning fallback`,
    );
    return fallback();
  }

  // Only the frames bucket is read here: the model sees blurred frames and nothing else.
  const frames = await deps.store.listFrames(clipId);
  let images: Uint8Array[];
  try {
    images = await mapWithConcurrency(frames, DOWNLOAD_CONCURRENCY, (frame) =>
      deps.blobs.download(FRAMES_BUCKET, frame.blurredPath),
    );
  } catch (error) {
    console.error(
      `[analyzeClip] could not load frames, returning fallback. ${describeError(error)}`,
    );
    return fallback();
  }

  const result = await deps.analyze({
    frames: frames.map((frame, index) => ({
      frameIndex: frame.frameIndex,
      tSeconds: frame.tSeconds,
      image: images[index],
    })),
    examples: [],
  });
  if (result.isFallback) return fallback();

  const frameIdByIndex = new Map(
    frames.map((frame) => [frame.frameIndex, frame.id]),
  );
  const createdAt = deps.now().toISOString();
  const events = result.data.events.flatMap((detected): EventRecord[] => {
    const frameId = frameIdByIndex.get(detected.frameIndex);
    if (!frameId) return [];
    return [
      {
        id: deps.newId(),
        clipId,
        frameId,
        frameIndex: detected.frameIndex,
        type: detected.type,
        confidence: detected.confidence,
        description: detected.description,
        flagged: detected.confidence >= thresholds[detected.type],
        createdAt,
        label: null,
      },
    ];
  });

  await deps.store.insertEvents(
    events.map((event) => ({
      id: event.id,
      clipId: event.clipId,
      frameId: event.frameId,
      type: event.type,
      confidence: event.confidence,
      description: event.description,
      flagged: event.flagged,
      createdAt: event.createdAt,
    })),
  );
  return respond(
    events.map((event) => toClipEvent(event, thresholds)),
    false,
  );
}
