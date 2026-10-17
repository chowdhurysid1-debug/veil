import type { ReactNode } from "react";
import { Crosshair } from "lucide-react";
import { cn } from "cn";

import type { ClipEvent } from "@/lib/contracts";

import {
  EVENT_STATUS_CLASSES,
  EVENT_STATUS_LABELS,
  eventStatus,
} from "./eventStyles";
import {
  EVENT_TYPE_LABELS,
  eventHeadline,
  formatClipTime,
  formatConfidence,
} from "./format";

interface EventCardProps {
  event: ClipEvent;
  tSeconds: number;
  isCurrent: boolean;
  onJump: () => void;
  /** Review controls, rendered in the decision column. */
  children?: ReactNode;
}

/** One alert as a console strip: what was seen, how sure, and the decision. */
export function EventCard({
  event,
  tSeconds,
  isCurrent,
  onJump,
  children,
}: EventCardProps) {
  const status = eventStatus(event);
  const needsReview = status === "flagged";
  return (
    <article
      aria-label={eventHeadline(event.type, tSeconds)}
      className={cn(
        "grid grid-cols-1 border bg-panel transition-colors duration-700 ease-veil md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]",
        needsReview && isCurrent ? "border-signal/50" : "border-hairline",
      )}
    >
      <div className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={cn(
              "label-mono inline-flex items-center gap-2 border px-2 py-1",
              EVENT_STATUS_CLASSES[status],
            )}
          >
            {needsReview && (
              <span
                aria-hidden
                className="size-1.5 animate-veil-blink rounded-full bg-signal"
              />
            )}
            {EVENT_STATUS_LABELS[status]}
          </span>
          <button
            type="button"
            onClick={onJump}
            className="label-mono inline-flex cursor-pointer items-center gap-1.5 text-ink-muted outline-none transition-colors duration-500 ease-veil hover:text-ink focus-visible:ring-1 focus-visible:ring-signal"
          >
            <Crosshair className="size-3" aria-hidden />
            T+{formatClipTime(tSeconds)}
          </button>
        </div>

        <h3 className="font-display text-title font-bold text-ink uppercase">
          Possible {EVENT_TYPE_LABELS[event.type].toLowerCase()}
        </h3>
        <p className="text-sm leading-relaxed text-ink-muted">
          {event.description}
        </p>
      </div>

      <div className="flex flex-col justify-between gap-5 border-t border-hairline p-5 md:border-t-0 md:border-l">
        <ConfidenceReadout
          confidence={event.confidence}
          threshold={event.threshold}
        />
        {children}
      </div>
    </article>
  );
}

function ConfidenceReadout({
  confidence,
  threshold,
}: {
  confidence: number;
  threshold: number;
}) {
  const isAbove = confidence >= threshold;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="label-mono">Model confidence</span>
        <span
          className={cn(
            "font-mono text-2xl font-medium tabular-nums",
            isAbove ? "text-signal" : "text-ink",
          )}
        >
          {Math.round(confidence * 100)}%
        </span>
      </div>
      <div
        role="meter"
        aria-label="Confidence against the learned threshold"
        aria-valuemin={0}
        aria-valuemax={1}
        aria-valuenow={confidence}
        aria-valuetext={`${formatConfidence(confidence)}, threshold ${formatConfidence(threshold)}, ${isAbove ? "above" : "below"} threshold`}
        className="relative h-3"
      >
        <span
          aria-hidden
          className="absolute inset-x-0 top-1/2 h-px bg-hairline-strong"
        />
        <span
          aria-hidden
          className={cn(
            "absolute top-1/2 left-0 h-[3px] -translate-y-1/2",
            isAbove ? "bg-signal" : "bg-ink-muted",
          )}
          style={{ width: `${confidence * 100}%` }}
        />
        <span
          aria-hidden
          className="absolute inset-y-0 w-px bg-ink"
          style={{ left: `${threshold * 100}%` }}
        />
      </div>
      <p className="label-mono">
        Learned threshold {formatConfidence(threshold)} ·{" "}
        {isAbove ? "Human review required" : "Below threshold, no alert"}
      </p>
    </div>
  );
}
