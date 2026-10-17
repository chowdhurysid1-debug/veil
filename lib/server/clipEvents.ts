import type { ClipEvent } from "../contracts";
import type { Thresholds } from "../learning/thresholds";
import type { EventRecord } from "./store";

// `threshold` is the current one for the event's type; `flagged` is what it was when analyzed.
export function toClipEvent(
  event: EventRecord,
  thresholds: Thresholds,
): ClipEvent {
  return {
    id: event.id,
    clipId: event.clipId,
    frameIndex: event.frameIndex,
    type: event.type,
    confidence: event.confidence,
    description: event.description,
    flagged: event.flagged,
    threshold: thresholds[event.type],
    label: event.label,
  };
}
