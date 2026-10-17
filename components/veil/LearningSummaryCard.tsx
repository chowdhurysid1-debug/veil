"use client";

import Link from "next/link";
import { ArrowRight, Brain } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import type { EventType, LearningStats } from "@/lib/contracts";

import { CountUp } from "./CountUp";
import { EVENT_TYPE_LABELS, formatConfidence, pluralize } from "./format";
import { LearningPulse } from "./LearningPulse";
import { useSessionLabelCount } from "./learningSession";
import { Meter } from "./ThresholdList";

interface LearningSummaryCardProps {
  stats: LearningStats | null;
  focusType: EventType | null;
}

/** Compact learning panel beside a clip, so a label's effect shows in place. */
export function LearningSummaryCard({
  stats,
  focusType,
}: LearningSummaryCardProps) {
  const sessionLabels = useSessionLabelCount();
  const focusRow = stats?.byType.find((row) => row.type === focusType);

  return (
    <section
      aria-label="Shared learning"
      className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
          <Brain className="size-4 text-indigo-400" aria-hidden />
          Shared learning
        </h2>
        <Link
          href="/learning"
          className="inline-flex items-center gap-1 rounded-md text-xs font-medium text-zinc-400 outline-none transition-all duration-200 hover:text-white focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          Details
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>

      {stats === null ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          <Skeleton className="h-8 w-24 bg-zinc-800" />
          <Skeleton className="h-6 w-full bg-zinc-800" />
        </div>
      ) : (
        <>
          <LearningPulse
            newLabels={sessionLabels}
            sites={stats.sitesContributing}
          />
          <p className="flex items-baseline gap-2">
            <CountUp
              value={stats.totalLabels}
              className="text-3xl font-bold tracking-tight text-white"
            />
            <span className="text-sm text-zinc-400">
              labels from {pluralize(stats.sitesContributing, "site")}
            </span>
          </p>
          {focusRow && (
            <Meter
              label={`${EVENT_TYPE_LABELS[focusRow.type]} alert threshold`}
              value={focusRow.threshold}
              display={formatConfidence(focusRow.threshold)}
              fillClassName="bg-indigo-400"
              isHighlighted={sessionLabels > 0}
            />
          )}
        </>
      )}
    </section>
  );
}
