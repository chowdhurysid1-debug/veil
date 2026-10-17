"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";

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
import { FramePlayer, type LockedFaceSummary } from "./FramePlayer";
import { getSessionLabelCount, recordLearnedLabel } from "./learningSession";
import { LockedFacesList } from "./LockedFacesList";
import { ReviewControls } from "./ReviewControls";
import { ErrorState } from "./States";
import { useToast } from "./Toaster";
import { UnlockFaceDialog } from "./UnlockFaceDialog";
import { useVeilQuery } from "./useVeilQuery";
import { WhatItLearned } from "./WhatItLearned";

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
  const learningBefore =
    learning.state.status === "success" ? learning.state.data : null;
  const { handleLabel, savingIds } = useEventReview(
    onClipChange,
    (stats, event, label) => {
      const thresholdOf = (source: LearningStats | null) =>
        source?.byType.find((row) => row.type === event.type)?.threshold ??
        null;
      recordLearnedLabel({
        eventType: event.type,
        label,
        thresholdBefore: thresholdOf(learningBefore),
        thresholdAfter: thresholdOf(stats),
        at: new Date().toISOString(),
      });
      updateLearning(() => stats);
      // On narrow screens the panel sits below the footage; bring it into view
      // so the officer sees what their label changed.
      if (window.matchMedia("(max-width: 1023px)").matches) {
        document
          .getElementById("what-it-learned")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    },
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

  const [unlockFace, setUnlockFace] = useState<LockedFaceSummary | null>(null);
  const [isUnlockOpen, setIsUnlockOpen] = useState(false);
  function openUnlock(face: LockedFaceSummary) {
    setCurrentIndex(indexOfFrame(face.frameIndex));
    setUnlockFace(face);
    setIsUnlockOpen(true);
  }

  const alerts =
    events.length === 0 ? (
      <div className="flex flex-col gap-2 border border-hairline bg-panel p-5">
        <p className="label-mono text-ink">Nothing flagged in this clip</p>
        <p className="text-sm leading-relaxed text-ink-muted">
          If analysis was unavailable, scrub the timeline to review it yourself.
          Every face stays blurred either way.
        </p>
      </div>
    ) : (
      <div className="flex flex-col gap-3">
        {events.map((event) => {
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
        })}
      </div>
    );

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-6 border-b border-hairline pb-8">
        <BackLink />
        <div className="flex flex-col gap-3">
          <p className="label-mono">Clip review / {clip.siteName}</p>
          <h1 className="font-display text-headline font-bold break-all text-ink">
            {clip.filename.replace(/\.[^.]+$/, "")}
          </h1>
        </div>
        <dl className="flex flex-wrap gap-x-10 gap-y-4">
          <Readout label="Stamped" value={formatStampDateTime(clip.stampedAt)} />
          <Readout
            label="Faces locked"
            value={String(clip.facesLocked).padStart(2, "0")}
          />
          <Readout label="Stored in the clear" value="00" />
          <div className="flex flex-col justify-end">
            <Link
              href={`/verify?clip=${clip.id}`}
              className="label-mono inline-flex items-center gap-1.5 text-ink-muted outline-none transition-colors duration-500 ease-veil hover:text-ink focus-visible:ring-1 focus-visible:ring-signal"
            >
              Verify footage
              <ArrowUpRight className="size-3.5" aria-hidden />
            </Link>
          </div>
        </dl>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_var(--spacing-rail)]">
        <FramePlayer
          frames={frames}
          events={events}
          faces={clip.faces}
          currentIndex={currentIndex}
          onSeek={setCurrentIndex}
          onFaceSelect={openUnlock}
          afterFrame={alerts}
        />

        <aside className="flex flex-col gap-8 lg:sticky lg:top-6 lg:self-start">
          {learning.state.status !== "error" && (
            <WhatItLearned
              stats={
                learning.state.status === "success" ? learning.state.data : null
              }
              focusType={(firstFlagged ?? events[0])?.type ?? null}
            />
          )}
          <LockedFacesList
            faces={clip.faces}
            frames={frames}
            onSelect={openUnlock}
          />
        </aside>
      </div>

      <UnlockFaceDialog
        face={unlockFace}
        tSeconds={
          unlockFace
            ? (frames[indexOfFrame(unlockFace.frameIndex)]?.tSeconds ?? 0)
            : 0
        }
        open={isUnlockOpen}
        onOpenChange={setIsUnlockOpen}
      />
    </div>
  );
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <dt className="label-mono">{label}</dt>
      <dd className="font-mono text-sm tracking-[0.06em] text-ink tabular-nums uppercase">
        {value}
      </dd>
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
  onLearned: (
    stats: LearningStats,
    event: ClipEvent,
    label: FeedbackLabel,
  ) => void,
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
      onLearned(stats, event, label);
      const newLabels = getSessionLabelCount();
      setSaving(event.id, false);
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
      className="label-mono inline-flex w-fit items-center gap-1.5 text-ink-muted outline-none transition-colors duration-500 ease-veil hover:text-ink focus-visible:ring-1 focus-visible:ring-signal"
    >
      <ArrowLeft className="size-3.5" aria-hidden />
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
