// Display helpers shared by every Veil screen. Relative imports keep this file loadable by vitest.
import type {
  EventType,
  FeedbackLabel,
  UnlockRequest,
} from "../../lib/contracts";

type UnlockReasonCategory = UnlockRequest["reasonCategory"];

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  fall: "Fall",
  fight: "Fight",
  theft: "Theft",
  fire: "Fire",
  other: "Other",
};

export const FEEDBACK_LABELS: Record<FeedbackLabel, string> = {
  real: "Real",
  false_alarm: "False alarm",
};

export const REASON_CATEGORY_LABELS: Record<UnlockReasonCategory, string> = {
  incident_investigation: "Incident investigation",
  safety_emergency: "Safety emergency",
  legal_request: "Legal request",
  other: "Other",
};

/** 13.5 -> "0:14". Clip offsets are rounded to the nearest second. */
export function formatClipTime(tSeconds: number): string {
  const total = Math.max(0, Math.round(tSeconds));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** "Possible fall at 0:14", the way the spec words an alert. */
export function eventHeadline(type: EventType, tSeconds: number): string {
  const what = type === "other" ? "incident" : type;
  return `Possible ${what} at ${formatClipTime(tSeconds)}`;
}

/** ISO date "2026-10-16" -> "Oct 16". Dates are calendar days, so no time zone shift. */
export function formatDay(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** ISO timestamp -> "21:04" in the viewer's time zone. */
export function formatStampTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** ISO timestamp -> "Oct 16, 21:04" in the viewer's time zone. */
export function formatStampDateTime(iso: string): string {
  const date = new Date(iso);
  const day = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  return `${day}, ${formatStampTime(iso)}`;
}

/** 0.714 -> "0.71". Confidence is shown the way the spec writes it. */
export function formatConfidence(value: number): string {
  return value.toFixed(2);
}

/** 0.4444 -> "44%". */
export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function pluralize(count: number, singular: string, plural?: string) {
  return `${count} ${count === 1 ? singular : (plural ?? `${singular}s`)}`;
}

/** Position of a frame on the timeline, 0..1, given the last frame's offset. */
export function timelinePosition(tSeconds: number, endSeconds: number): number {
  if (endSeconds <= 0) return 0;
  return Math.min(1, Math.max(0, tSeconds / endSeconds));
}
