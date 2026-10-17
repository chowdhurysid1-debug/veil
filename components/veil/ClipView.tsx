"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CircleCheck, ShieldCheck, Stamp } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import type {
  ClipDetail,
  ClipEvent,
  FeedbackLabel,
  LearningStats,
} from "@/lib/contracts";

import { veilApi } from "./api";
import { friendlyErrorMessage } from "./errors";
import { EventCard } from "./EventCard";
import {
  EVENT_TYPE_LABELS,
  FEEDBACK_LABELS,
  formatConfidence,
  formatStampDateTime,
  pluralize,
} from "./format";
import { FramePlayer } from "./FramePlayer";
import { recordLearnedLabel } from "./learningSession";
import { LearningSummaryCard } from "./LearningSummaryCard";
import { ReviewControls } from "./ReviewControls";
import { ErrorState } from "./States";
import { useToast } from "./Toaster";
import { useVeilQuery } from "./useVeilQuery";

type ClipUpdater = (update: (clip: ClipDetail) => ClipDetail) => void;

export function ClipView({ clipId }: { clipId: string }) {
  const { state, retry, update } = useVeilQuery(clipId, veilApi.getClip);

  if (state.status === "loading") return <ClipViewSkeleton />;
  if (state.status === "error") {
    return (
      <div className="flex flex-col gap-6">
        <BackLink />
        <ErrorState message={state.message} onRetry={retry} />
      </div>
    );
  }
  return (
    <ClipReview key={state.data.id} clip={state.data} onClipChange={update} />
  );
}

function ClipReview({
  clip,
  onClipChange,
}: {
  clip: ClipDetail;
  onClipChange: ClipUpdater;
}) {
  const learning = useVeilQuery("learning", veilApi.getLearningStats);
  const updateLearning = learning.update;
  const { handleLabel, savingIds } = useEventReview(onClipChange, (stats) =>
    updateLearning(() => stats),
  );
  const frames = useMemo(
    () => [...clip.frames].sort((a, b) => a.frameIndex - b.frameIndex),
    [clip.frames],
  );
  const events = useMemo(
    () => [...clip.events].sort((a, b) => a.frameIndex - b.frameIndex),
    [clip.events],
  );
  const indexOfFrame = (frameIndex: number) =>
    Math.max(
      0,
      frames.findIndex((frame) => frame.frameIndex === frameIndex),
    );

  // Open on the first flagged alert so the officer lands on what matters.
  const firstFlagged = events.find((event) => event.flagged);
  const [currentIndex, setCurrentIndex] = useState(() =>
    firstFlagged ? indexOfFrame(firstFlagged.frameIndex) : 0,
  );
  const currentFrameIndex = frames[currentIndex]?.frameIndex;

  return (
    <div className="flex flex-col gap-6">
      <BackLink />
      <header className="flex flex-col gap-3">
        <h1 className="truncate font-mono text-xl font-semibold tracking-tight text-white md:text-2xl">
          {clip.filename}
        </h1>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-zinc-500">{clip.siteName}</span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-800/60 px-2.5 py-0.5 font-medium text-zinc-300">
            <Stamp className="size-3.5" aria-hidden />
            Stamped {formatStampDateTime(clip.stampedAt)}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-0.5 font-medium text-indigo-300">
            <ShieldCheck className="size-3.5" aria-hidden />
            {pluralize(clip.facesLocked, "face")} locked, 0 in the clear
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <FramePlayer
          frames={frames}
          events={events}
          faces={clip.faces}
          currentIndex={currentIndex}
          onSeek={setCurrentIndex}
        />

        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-zinc-300">
            {events.length === 0
              ? "Alerts"
              : `${pluralize(events.length, "alert")} in this clip`}
          </h2>
          {events.length === 0 ? (
            <div className="flex flex-col items-start gap-2 rounded-2xl border border-dashed border-zinc-800 p-5">
              <CircleCheck className="size-5 text-emerald-400" aria-hidden />
              <p className="text-sm font-medium text-zinc-200">
                Nothing flagged in this clip
              </p>
              <p className="text-sm leading-relaxed text-zinc-500">
                If analysis was unavailable, scrub the timeline to review it
                yourself. Every face stays blurred either way.
              </p>
            </div>
          ) : (
            events.map((event) => {
              const index = indexOfFrame(event.frameIndex);
              return (
                <EventCard
                  key={event.id}
                  event={event}
                  tSeconds={frames[index]?.tSeconds ?? 0}
                  isCurrent={event.frameIndex === currentFrameIndex}
                  onJump={() => setCurrentIndex(index)}
                >
                  <ReviewControls
                    label={event.label}
                    isSaving={savingIds.has(event.id)}
                    onLabel={(label) => handleLabel(event, label)}
                  />
                </EventCard>
              );
            })
          )}
          {learning.state.status !== "error" && (
            <LearningSummaryCard
              stats={
                learning.state.status === "success" ? learning.state.data : null
              }
              focusType={(firstFlagged ?? events[0])?.type ?? null}
            />
          )}
        </div>
      </div>
    </div>
  );
}

const UNDO_WINDOW_MS = 5000;

/**
 * Optimistic labels with an undo window. The label shows at once; the request
 * goes out only when the undo notice closes, so Undo never needs a delete route.
 */
function useEventReview(
  onClipChange: ClipUpdater,
  onLearned: (stats: LearningStats) => void,
) {
  const router = useRouter();
  const { showToast } = useToast();
  const [savingIds, setSavingIds] = useState<ReadonlySet<string>>(new Set());

  function setSaving(eventId: string, isSaving: boolean) {
    setSavingIds((current) => {
      const next = new Set(current);
      if (isSaving) next.add(eventId);
      else next.delete(eventId);
      return next;
    });
  }

  function setLabel(eventId: string, label: FeedbackLabel | null) {
    onClipChange((clip) => ({
      ...clip,
      events: clip.events.map((event) =>
        event.id === eventId ? { ...event, label } : event,
      ),
    }));
  }

  async function save(event: ClipEvent, label: FeedbackLabel) {
    try {
      const { stats } = await veilApi.submitFeedback(event.id, { label });
      const newLabels = recordLearnedLabel();
      setSaving(event.id, false);
      onLearned(stats);
      const row = stats.byType.find((item) => item.type === event.type);
      showToast({
        tone: "success",
        title: `Learned from ${pluralize(newLabels, "new label")} across ${pluralize(stats.sitesContributing, "site")}`,
        description: row
          ? `${EVENT_TYPE_LABELS[event.type]} alerts now need confidence ${formatConfidence(row.threshold)} or higher, at every site.`
          : undefined,
        durationMs: 7000,
        action: {
          label: "See learning",
          onAction: () => router.push("/learning"),
        },
      });
    } catch (error) {
      setLabel(event.id, null);
      setSaving(event.id, false);
      showToast({
        tone: "error",
        title: "That label didn't save",
        description: `${friendlyErrorMessage(error)} The alert is back to unreviewed.`,
      });
    }
  }

  function handleLabel(event: ClipEvent, label: FeedbackLabel) {
    setLabel(event.id, label);
    setSaving(event.id, true);
    showToast({
      title: `Marked as ${FEEDBACK_LABELS[label].toLowerCase()}`,
      description: "Saving in 5 seconds. Every site learns from it.",
      durationMs: UNDO_WINDOW_MS,
      action: {
        label: "Undo",
        onAction: () => {
          setLabel(event.id, null);
          setSaving(event.id, false);
        },
      },
      onExpire: () => void save(event, label),
    });
  }

  return { handleLabel, savingIds };
}

function BackLink() {
  return (
    <Link
      href="/clips"
      className="inline-flex w-fit items-center gap-1.5 rounded-lg text-sm text-zinc-400 outline-none transition-all duration-200 hover:text-white focus-visible:ring-2 focus-visible:ring-indigo-500"
    >
      <ArrowLeft className="size-4" aria-hidden />
      All clips
    </Link>
  );
}

export function ClipViewSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <span className="sr-only">Loading clip</span>
      <Skeleton className="h-5 w-24 bg-zinc-900" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-7 w-64 bg-zinc-900" />
        <Skeleton className="h-5 w-80 bg-zinc-900" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-4">
          <Skeleton className="aspect-video w-full rounded-2xl bg-zinc-900" />
          <Skeleton className="h-11 w-48 bg-zinc-900" />
          <Skeleton className="h-10 w-full bg-zinc-900" />
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-5 w-32 bg-zinc-900" />
          <Skeleton className="h-64 w-full rounded-2xl bg-zinc-900" />
        </div>
      </div>
    </div>
  );
}
