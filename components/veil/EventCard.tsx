import type { ReactNode } from "react";
import { Crosshair } from "lucide-react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import type { ClipEvent } from "@/lib/contracts";

import {
  EVENT_ICONS,
  EVENT_STATUS_CLASSES,
  EVENT_STATUS_LABELS,
  eventStatus,
} from "./eventStyles";
import { eventHeadline, formatClipTime, formatConfidence } from "./format";

interface EventCardProps {
  event: ClipEvent;
  tSeconds: number;
  isCurrent: boolean;
  onJump: () => void;
  /** Review controls, rendered under the confidence meter. */
  children?: ReactNode;
}

export function EventCard({
  event,
  tSeconds,
  isCurrent,
  onJump,
  children,
}: EventCardProps) {
  const status = eventStatus(event);
  const Icon = EVENT_ICONS[event.type];
  return (
    <article
      aria-label={eventHeadline(event.type, tSeconds)}
      className={cn(
        "flex flex-col gap-4 rounded-2xl border bg-zinc-900 p-5 transition-all duration-200",
        isCurrent
          ? "border-indigo-500/50 shadow-lg shadow-indigo-500/10"
          : "border-zinc-800",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "rounded-xl p-2.5",
            status === "below"
              ? "bg-zinc-800 text-zinc-400"
              : "bg-amber-500/10 text-amber-300",
          )}
        >
          <Icon className="size-5" aria-hidden />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3 className="text-base font-semibold text-white">
            {eventHeadline(event.type, tSeconds)}
          </h3>
          <span
            className={cn(
              "inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
              EVENT_STATUS_CLASSES[status],
            )}
          >
            {EVENT_STATUS_LABELS[status]}
          </span>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-zinc-300">
        {event.description}
      </p>

      <ConfidenceMeter
        confidence={event.confidence}
        threshold={event.threshold}
      />

      {children}

      <Button
        variant="ghost"
        className="h-9 w-fit px-2 text-xs"
        onClick={onJump}
      >
        <Crosshair aria-hidden />
        Show frame at {formatClipTime(tSeconds)}
      </Button>
    </article>
  );
}

function ConfidenceMeter({
  confidence,
  threshold,
}: {
  confidence: number;
  threshold: number;
}) {
  const isAbove = confidence >= threshold;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-zinc-400">
          Confidence{" "}
          <span className="font-mono text-sm font-semibold text-white">
            {formatConfidence(confidence)}
          </span>
        </span>
        <span className="text-zinc-500">
          Learned threshold{" "}
          <span className="font-mono text-zinc-300">
            {formatConfidence(threshold)}
          </span>
        </span>
      </div>
      <div
        role="meter"
        aria-label="Confidence against the learned threshold"
        aria-valuemin={0}
        aria-valuemax={1}
        aria-valuenow={confidence}
        aria-valuetext={`${formatConfidence(confidence)}, threshold ${formatConfidence(threshold)}, ${isAbove ? "above" : "below"} threshold`}
        className="relative h-2 rounded-full bg-zinc-800"
      >
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full",
            isAbove ? "bg-amber-400" : "bg-zinc-500",
          )}
          style={{ width: `${confidence * 100}%` }}
        />
        <div
          aria-hidden
          className="absolute -inset-y-1 w-0.5 rounded-full bg-white"
          style={{ left: `${threshold * 100}%` }}
        />
      </div>
      <p className="text-xs text-zinc-500">
        {isAbove
          ? "Above the threshold, so a human has to look."
          : "Below the threshold set by past false alarms, so nobody was alerted."}
      </p>
    </div>
  );
}
