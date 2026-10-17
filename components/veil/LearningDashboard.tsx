"use client";

import {
  Brain,
  Layers,
  ScanFace,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { cn } from "cn";

import { Skeleton } from "@/components/ui/skeleton";
import type { LearningStats } from "@/lib/contracts";

import { veilApi } from "./api";
import { CountUp } from "./CountUp";
import { EVENT_ICONS } from "./eventStyles";
import { FalseAlarmChart } from "./FalseAlarmChart";
import {
  EVENT_TYPE_LABELS,
  FEEDBACK_LABELS,
  formatDay,
  formatPercent,
  formatStampDateTime,
} from "./format";
import { LearningPulse } from "./LearningPulse";
import { useSessionLabelCount } from "./learningSession";
import { EmptyState, ErrorState } from "./States";
import { ThresholdList } from "./ThresholdList";
import { useVeilQuery } from "./useVeilQuery";

export function LearningDashboard() {
  const { state, retry } = useVeilQuery("learning", veilApi.getLearningStats);
  const sessionLabels = useSessionLabelCount();

  if (state.status === "loading") return <LearningSkeleton />;
  if (state.status === "error") {
    return <ErrorState message={state.message} onRetry={retry} />;
  }

  const stats = state.data;
  if (stats.totalLabels === 0) {
    return (
      <EmptyState
        icon={Brain}
        title="No labels yet"
        description="Open a clip and mark an alert Real or False alarm. Every label tunes detection for every site."
      />
    );
  }

  const highlightType = sessionLabels > 0 ? stats.recent[0]?.eventType : null;

  return (
    <div className="flex flex-col gap-6">
      <LearningPulse
        newLabels={sessionLabels}
        sites={stats.sitesContributing}
      />
      <StatTiles stats={stats} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
          <div>
            <h2 className="text-base font-semibold text-white">
              {chartTitle(stats.history)}
            </h2>
            <p className="text-sm text-zinc-500">
              Share of reviewed alerts marked false alarm, all sites, by day
            </p>
          </div>
          {stats.history.length > 0 ? (
            <FalseAlarmChart history={stats.history} />
          ) : (
            <p className="text-sm text-zinc-500">
              The trend appears after the first day of labels.
            </p>
          )}
        </section>

        <RecentLabels recent={stats.recent} />
      </div>

      <section className="flex flex-col gap-5 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold text-white">
            Alert thresholds by type
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-zinc-500">
            An alert reaches a person only when the AI&apos;s confidence clears
            its type&apos;s threshold. False alarms raise it. Real incidents
            lower it.
          </p>
        </div>
        <ThresholdList rows={stats.byType} highlightType={highlightType} />
      </section>

      <HowItLearns />
    </div>
  );
}

function chartTitle(history: LearningStats["history"]) {
  const first = history[0];
  const last = history.at(-1);
  if (!first || !last || first === last) return "False-alarm rate";
  return last.falseAlarmRate < first.falseAlarmRate
    ? "False alarms are falling"
    : "False-alarm rate";
}

function StatTiles({ stats }: { stats: LearningStats }) {
  const first = stats.history[0];
  const last = stats.history.at(-1);
  const isFalling =
    first && last ? last.falseAlarmRate <= first.falseAlarmRate : true;
  const TrendIcon = isFalling ? TrendingDown : TrendingUp;
  return (
    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-b from-indigo-500/10 to-zinc-900 p-5">
        <dt className="text-sm text-zinc-400">Human labels</dt>
        <dd className="mt-1 text-5xl font-bold tracking-tight text-white">
          <CountUp value={stats.totalLabels} />
        </dd>
        <dd className="mt-1 text-xs text-zinc-500">
          Shared with every site, never tied to a face
        </dd>
      </div>
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <dt className="text-sm text-zinc-400">Sites contributing</dt>
        <dd className="mt-1 text-4xl font-semibold tracking-tight text-white">
          <CountUp value={stats.sitesContributing} />
        </dd>
        <dd className="mt-1 text-xs text-zinc-500">
          A school and a store teach each other
        </dd>
      </div>
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <dt className="text-sm text-zinc-400">False-alarm rate today</dt>
        <dd className="mt-1 text-4xl font-semibold tracking-tight text-white">
          {last ? formatPercent(last.falseAlarmRate) : "None yet"}
        </dd>
        {first && last && first !== last && (
          <dd
            className={cn(
              "mt-1 inline-flex items-center gap-1 text-xs",
              isFalling ? "text-emerald-300" : "text-amber-300",
            )}
          >
            <TrendIcon className="size-3.5" aria-hidden />
            {isFalling ? "Down" : "Up"} from{" "}
            {formatPercent(first.falseAlarmRate)} on {formatDay(first.date)}
          </dd>
        )}
      </div>
    </dl>
  );
}

function RecentLabels({ recent }: { recent: LearningStats["recent"] }) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
      <h2 className="text-base font-semibold text-white">Recent labels</h2>
      {recent.length === 0 ? (
        <p className="text-sm text-zinc-500">No labels yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {recent.map((item) => {
            const Icon = EVENT_ICONS[item.eventType];
            return (
              <li
                key={`${item.createdAt}-${item.eventType}-${item.siteName}`}
                className="flex items-center gap-3"
              >
                <div className="rounded-lg bg-zinc-800 p-2 text-zinc-300">
                  <Icon className="size-4" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-zinc-100">
                    {EVENT_TYPE_LABELS[item.eventType]}
                    <span
                      className={cn(
                        "ml-2 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                        item.label === "real"
                          ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
                      )}
                    >
                      {FEEDBACK_LABELS[item.label]}
                    </span>
                  </p>
                  <p className="truncate text-xs text-zinc-500">
                    {item.siteName} · {formatStampDateTime(item.createdAt)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function HowItLearns() {
  const items = [
    {
      icon: Layers,
      title: "Few-shot examples",
      text: "Past labels for the same event type, from every site, ride along with each analysis.",
    },
    {
      icon: SlidersHorizontal,
      title: "Calibrated thresholds",
      text: "Each type's threshold follows its false-alarm rate, so noisy types need more confidence.",
    },
    {
      icon: ScanFace,
      title: "No faces involved",
      text: "The AI only sees blurred frames. A label is a type and a verdict, never a person.",
    },
  ];
  return (
    <section
      aria-label="How the AI learns"
      className="grid gap-3 md:grid-cols-3"
    >
      {items.map(({ icon: Icon, title, text }) => (
        <div
          key={title}
          className="flex gap-3 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5"
        >
          <div className="h-fit rounded-xl bg-indigo-500/10 p-2.5 text-indigo-400">
            <Icon className="size-5" aria-hidden />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
            <p className="text-sm leading-relaxed text-zinc-400">{text}</p>
          </div>
        </div>
      ))}
    </section>
  );
}

function LearningSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <span className="sr-only">Loading learning stats</span>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-32 rounded-2xl bg-zinc-900" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Skeleton className="h-80 rounded-2xl bg-zinc-900" />
        <Skeleton className="h-80 rounded-2xl bg-zinc-900" />
      </div>
      <Skeleton className="h-64 rounded-2xl bg-zinc-900" />
    </div>
  );
}
