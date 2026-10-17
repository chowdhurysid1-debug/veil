"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { cn } from "cn";

import type { EventType, LearningStats } from "@/lib/contracts";

import { CountUp } from "./CountUp";
import {
  EVENT_TYPE_LABELS,
  FEEDBACK_LABELS,
  formatConfidence,
  formatStampTime,
  isThresholdShown,
} from "./format";
import {
  useLastLearningUpdate,
  useSessionLabelCount,
  type LearningUpdate,
} from "./learningSession";
import { MOTION } from "./motion";

const TYPE_ORDER: EventType[] = ["fight", "fall", "theft", "other", "fire"];

interface WhatItLearnedProps {
  stats: LearningStats | null;
  /** The type of the alert on screen, called out in the threshold list. */
  focusType: EventType | null;
  className?: string;
}

/**
 * The hero of the demo: shared learning, live. When an officer labels an
 * alert, the label counter ticks, the threshold for that type slides to its
 * new value with a ghost of the old one, and the update is logged in place.
 */
export function WhatItLearned({
  stats,
  focusType,
  className,
}: WhatItLearnedProps) {
  const sessionLabels = useSessionLabelCount();
  const lastUpdate = useLastLearningUpdate();
  const shouldReduceMotion = useReducedMotion();
  const isLive = sessionLabels > 0;

  return (
    <section
      id="what-it-learned"
      aria-label="What it learned"
      className={cn(
        "relative flex flex-col border bg-panel transition-colors duration-[2400ms] ease-veil",
        isLive ? "border-signal/50" : "border-hairline",
        className,
      )}
    >
      <header className="flex items-center justify-between gap-3 border-b border-hairline px-5 py-3">
        <h2 className="label-mono text-ink">What it learned</h2>
        <span
          className={cn(
            "label-mono flex items-center gap-2",
            isLive ? "text-signal" : "text-ink-dim",
          )}
        >
          <span
            aria-hidden
            className={cn(
              "size-1.5 rounded-full",
              isLive ? "animate-veil-blink bg-signal" : "bg-ink-dim",
            )}
          />
          {isLive ? "Learning" : "Live"}
        </span>
      </header>

      {stats === null ? (
        <PanelSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-2 border-b border-hairline">
            <Counter
              label="Labels, all sites"
              value={stats.totalLabels}
              isHighlighted={isLive}
            />
            <Counter
              label="Sites sharing"
              value={stats.sitesContributing}
              className="border-l border-hairline"
            />
          </div>

          <div className="flex flex-col gap-4 border-b border-hairline px-5 py-5">
            <p className="label-mono">Alert threshold by type</p>
            <ul className="flex flex-col gap-3.5">
              {TYPE_ORDER.map((type) => {
                const row = stats.byType.find((item) => item.type === type);
                if (!row || !isThresholdShown(row)) return null;
                const change =
                  lastUpdate?.eventType === type ? lastUpdate : null;
                return (
                  <ThresholdRow
                    key={type}
                    type={type}
                    threshold={row.threshold}
                    labels={row.labels}
                    change={change}
                    isFocus={type === focusType}
                    shouldReduceMotion={Boolean(shouldReduceMotion)}
                  />
                );
              })}
            </ul>
          </div>

          <UpdateLog update={lastUpdate} />

          <Link
            href="/learning"
            className="label-mono flex items-center justify-between px-5 py-3 text-ink-muted outline-none transition-colors duration-500 ease-veil hover:bg-white/[0.03] hover:text-ink focus-visible:ring-1 focus-visible:ring-signal focus-visible:ring-inset"
          >
            Full learning record
            <ArrowUpRight className="size-3.5" aria-hidden />
          </Link>
        </>
      )}
    </section>
  );
}

function Counter({
  label,
  value,
  isHighlighted = false,
  className,
}: {
  label: string;
  value: number;
  isHighlighted?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2 px-5 py-5", className)}>
      {/* Size lives on the wrapper: cn() would merge text-counter away next to a color. */}
      <span className="font-display text-counter font-semibold tabular-nums">
        <CountUp
          value={value}
          padTo={2}
          className={cn(
            "transition-colors duration-[2400ms] ease-veil",
            isHighlighted ? "text-signal" : "text-ink",
          )}
        />
      </span>
      <span className="label-mono">{label}</span>
    </div>
  );
}

function ThresholdRow({
  type,
  threshold,
  labels,
  change,
  isFocus,
  shouldReduceMotion,
}: {
  type: EventType;
  threshold: number;
  labels: number;
  change: LearningUpdate | null;
  isFocus: boolean;
  shouldReduceMotion: boolean;
}) {
  const before = change?.thresholdBefore ?? null;
  const hasMoved = before !== null && Math.abs(before - threshold) >= 0.005;
  const delta = hasMoved ? threshold - before : 0;

  return (
    <li className="grid grid-cols-[4.5rem_minmax(0,1fr)_3.75rem] items-center gap-3">
      <span
        className={cn(
          "label-mono transition-colors duration-[2400ms] ease-veil",
          hasMoved ? "text-signal" : isFocus ? "text-ink" : "text-ink-dim",
        )}
      >
        {EVENT_TYPE_LABELS[type]}
      </span>

      <div
        role="meter"
        aria-label={`${EVENT_TYPE_LABELS[type]} alert threshold, from ${labels} labels`}
        aria-valuemin={0}
        aria-valuemax={1}
        aria-valuenow={threshold}
        aria-valuetext={formatConfidence(threshold)}
        className="relative h-4"
      >
        <span
          aria-hidden
          className="absolute inset-x-0 top-1/2 h-px bg-hairline-strong"
        />
        {/* Ghost of the old threshold, left behind when a label moves it. */}
        {hasMoved && (
          <span
            aria-hidden
            className="absolute inset-y-0.5 w-px bg-ink-dim"
            style={{ left: `${before * 100}%` }}
          />
        )}
        <motion.span
          aria-hidden
          className={cn(
            "absolute inset-y-0 w-0.5 -translate-x-1/2",
            hasMoved ? "bg-signal" : isFocus ? "bg-ink" : "bg-ink-muted",
          )}
          initial={false}
          animate={{ left: `${threshold * 100}%` }}
          transition={shouldReduceMotion ? { duration: 0 } : MOTION.slide}
        />
      </div>

      <span className="flex flex-col items-end font-mono text-xs tabular-nums">
        <span className={hasMoved ? "text-signal" : "text-ink"}>
          {formatConfidence(threshold)}
        </span>
        {hasMoved && (
          <span className="text-[10px] text-signal/80">
            {delta > 0 ? "+" : ""}
            {delta.toFixed(2)}
          </span>
        )}
      </span>
    </li>
  );
}

function UpdateLog({ update }: { update: LearningUpdate | null }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-24 flex-col gap-2 border-b border-hairline px-5 py-4"
    >
      <p className="label-mono">Last update</p>
      <AnimatePresence mode="wait" initial={false}>
        {update ? (
          <motion.p
            key={update.at}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={MOTION.fade}
            className="font-mono text-xs leading-relaxed tracking-[0.06em] text-signal uppercase"
          >
            {formatStampTime(update.at)} · Officer marked{" "}
            {EVENT_TYPE_LABELS[update.eventType]} as{" "}
            {FEEDBACK_LABELS[update.label]}
            {update.thresholdBefore !== null &&
              update.thresholdAfter !== null && (
                <>
                  {" "}
                  · Threshold {formatConfidence(update.thresholdBefore)} to{" "}
                  {formatConfidence(update.thresholdAfter)} at every site
                </>
              )}
          </motion.p>
        ) : (
          <motion.p
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={MOTION.fade}
            className="text-sm leading-relaxed text-ink-muted"
          >
            Mark an alert Real or False alarm. Every site learns from it.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

function PanelSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-5 py-5" aria-busy="true">
      <span className="sr-only">Loading learning</span>
      <div className="h-14 w-24 animate-pulse bg-panel-2" />
      {TYPE_ORDER.map((type) => (
        <div key={type} className="h-4 w-full animate-pulse bg-panel-2" />
      ))}
    </div>
  );
}
