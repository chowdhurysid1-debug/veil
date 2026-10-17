"use client";

import { useEffect, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Lock } from "lucide-react";
import { cn } from "cn";

import { MOTION } from "@/components/veil/motion";
import { veilApi } from "@/components/veil/api";
import { useVeilQuery } from "@/components/veil/useVeilQuery";
import type { EventType } from "@/lib/contracts";

import type { Source } from "./sources";

/**
 * The deck's signature move: content comes into focus from a blur, the way
 * Veil treats a face. Re-runs every time a slide mounts.
 */
export function Reveal({
  children,
  className,
  order = 0,
}: {
  children: ReactNode;
  className?: string;
  /** Position in the slide's reveal sequence. */
  order?: number;
}) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={
        shouldReduceMotion ? false : { opacity: 0, y: 10, filter: "blur(14px)" }
      }
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ ...MOTION.fade, delay: 0.12 + order * 0.11 }}
    >
      {children}
    </motion.div>
  );
}

/** Standard slide layout: mono kicker, uppercase headline, then the body. */
export function SlideFrame({
  kicker,
  title,
  children,
  isSignal = false,
  className,
}: {
  kicker: string;
  title: ReactNode;
  children?: ReactNode;
  isSignal?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto flex min-h-full w-full max-w-7xl flex-col justify-center gap-8 py-6 md:gap-12",
        className,
      )}
    >
      <Reveal className="flex flex-col gap-5">
        <p className={cn("label-mono", isSignal && "text-signal")}>{kicker}</p>
        <h2 className="max-w-[20ch] font-display text-headline font-bold text-balance">
          {title}
        </h2>
      </Reveal>
      {children}
    </div>
  );
}

export function SourceLink({ source }: { source: Source }) {
  return (
    <a
      href={source.href}
      target="_blank"
      rel="noopener noreferrer"
      className="label-mono inline-flex cursor-pointer items-center gap-1.5 transition-colors duration-500 ease-veil hover:text-ink focus-visible:text-ink focus-visible:outline-none"
    >
      Source: {source.label}
      <ArrowUpRight className="size-3.5 shrink-0" aria-hidden />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

/** A large sourced number with its one-line meaning. */
export function Figure({
  figure,
  text,
  source,
  order,
}: {
  figure: string;
  text: string;
  source: Source;
  order: number;
}) {
  return (
    <Reveal
      order={order}
      className="flex flex-col gap-4 border-t border-hairline-strong pt-5"
    >
      <span className="font-display text-counter font-bold tracking-tight text-ink uppercase tabular-nums">
        {figure}
      </span>
      <span className="max-w-xs text-base leading-relaxed text-ink-muted">
        {text}
      </span>
      <SourceLink source={source} />
    </Reveal>
  );
}

const FACE_COUNT = 12;
const LOCK_STEP_MS = 190;
const LOCK_START_MS = 900;

/**
 * Twelve abstract head-and-shoulder silhouettes lock one by one, with the same
 * two readouts the upload screen shows. Not people: plain shapes.
 */
export function FaceLockGrid() {
  const shouldReduceMotion = useReducedMotion();
  const [lockedCount, setLockedCount] = useState(0);
  const displayedCount = shouldReduceMotion ? FACE_COUNT : lockedCount;

  useEffect(() => {
    if (shouldReduceMotion) return;
    let interval: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      interval = setInterval(() => {
        setLockedCount((count) => {
          if (count + 1 >= FACE_COUNT) clearInterval(interval);
          return Math.min(count + 1, FACE_COUNT);
        });
      }, LOCK_STEP_MS);
    }, LOCK_START_MS);
    return () => {
      clearTimeout(start);
      clearInterval(interval);
    };
  }, [shouldReduceMotion]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-6 border-t border-l border-hairline">
        {Array.from({ length: FACE_COUNT }, (_, index) => {
          const isLocked = index < displayedCount;
          return (
            <div
              key={index}
              className="relative aspect-[4/5] overflow-hidden border-r border-b border-hairline bg-panel"
            >
              <svg
                viewBox="0 0 40 50"
                aria-hidden
                className="absolute inset-0 size-full transition-[filter,opacity] duration-700 ease-veil"
                style={{
                  filter: isLocked ? "blur(5px)" : "none",
                  opacity: isLocked ? 0.55 : 0.9,
                }}
              >
                <circle cx="20" cy="19" r="8" fill="#5c5b56" />
                <path d="M6 50c0-9 6.3-15 14-15s14 6 14 15z" fill="#3e3d39" />
              </svg>
              <div
                className={cn(
                  "absolute inset-[22%_24%_42%] border transition-colors duration-500 ease-veil",
                  isLocked ? "border-ink/70" : "border-transparent",
                )}
              />
              {isLocked && (
                <Lock
                  className="absolute right-1.5 bottom-1.5 size-3 text-ink"
                  aria-hidden
                />
              )}
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-4" aria-live="polite">
        <Readout
          label="Faces locked"
          value={String(displayedCount).padStart(2, "0")}
        />
        <Readout label="Stored in the clear" value="00" />
      </div>
    </div>
  );
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="label-mono">{label}</span>
      <span className="font-mono text-2xl text-ink tabular-nums">{value}</span>
    </div>
  );
}

// Thresholds the seed labels in lib/learning/seed.ts produce (lib/learning/thresholds.test.ts pins them).
const SEED_STATS = {
  totalLabels: 20,
  sitesContributing: 2,
  byType: [
    { type: "fall", threshold: 0.58 },
    { type: "fight", threshold: 0.5 },
    { type: "theft", threshold: 0.5 },
    { type: "other", threshold: 0.48 },
  ] satisfies { type: EventType; threshold: number }[],
};

/** Reads /api/learning/stats. Falls back to the seed values, clearly labeled. */
export function LiveLearning() {
  const { state } = useVeilQuery("learning", veilApi.getLearningStats);

  if (state.status === "loading") {
    return (
      <div className="flex flex-col gap-4 border border-hairline bg-panel p-5">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="h-6 animate-pulse bg-panel-2" />
        ))}
      </div>
    );
  }

  const isLive = state.status === "success";
  const stats = isLive ? state.data : SEED_STATS;

  return (
    <div className="flex flex-col border border-signal/40 bg-panel">
      <div className="flex items-center justify-between gap-4 border-b border-hairline px-5 py-3">
        <span className="label-mono text-ink">
          {isLive ? "Live from /api/learning/stats" : "Seed values"}
        </span>
        <span className="label-mono inline-flex items-center gap-2">
          <span
            aria-hidden
            className={cn(
              "size-1.5 rounded-full",
              isLive ? "animate-veil-blink bg-signal" : "bg-ink-dim",
            )}
          />
          {isLive ? "Live" : "Offline"}
        </span>
      </div>
      <div className="grid grid-cols-2 border-b border-hairline">
        <div className="flex flex-col gap-1 border-r border-hairline px-5 py-4">
          <span className="label-mono">Labels learned</span>
          <span className="font-mono text-3xl text-ink tabular-nums">
            {stats.totalLabels}
          </span>
        </div>
        <div className="flex flex-col gap-1 px-5 py-4">
          <span className="label-mono">Sites sharing</span>
          <span className="font-mono text-3xl text-ink tabular-nums">
            {stats.sitesContributing}
          </span>
        </div>
      </div>
      <ul className="flex flex-col gap-3 px-5 py-5">
        {stats.byType.map(({ type, threshold }) => (
          <li
            key={type}
            className="grid grid-cols-[4.5rem_minmax(0,1fr)_3rem] items-center gap-3"
          >
            <span className="label-mono text-ink">{type}</span>
            <span className="relative h-1.5 bg-panel-2">
              <motion.span
                className="absolute inset-y-0 left-0 bg-signal"
                initial={{ width: 0 }}
                animate={{ width: `${threshold * 100}%` }}
                transition={MOTION.slide}
              />
            </span>
            <span className="text-right font-mono text-sm text-ink tabular-nums">
              {threshold.toFixed(2)}
            </span>
          </li>
        ))}
      </ul>
      <p className="label-mono border-t border-hairline px-5 py-3 leading-relaxed">
        {isLive
          ? "Alert threshold per event type, shared by every site"
          : "Live data offline. Showing the seed thresholds from the build log"}
      </p>
    </div>
  );
}
