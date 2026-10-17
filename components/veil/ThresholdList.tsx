"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "cn";

import type { EventType, LearningStats } from "@/lib/contracts";

import { EVENT_ICONS } from "./eventStyles";
import {
  EVENT_TYPE_LABELS,
  formatConfidence,
  formatPercent,
  pluralize,
} from "./format";

type ThresholdRow = LearningStats["byType"][number];

interface ThresholdListProps {
  rows: ThresholdRow[];
  /** Type to call out, e.g. the one just labeled. */
  highlightType?: EventType | null;
}

export function ThresholdList({ rows, highlightType }: ThresholdListProps) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-800 p-5 text-sm text-zinc-400">
        No labels yet. The first Real or False alarm label sets a threshold for
        that type at every site.
      </p>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-zinc-800/80">
      {rows.map((row) => (
        <ThresholdItem
          key={row.type}
          row={row}
          isHighlighted={row.type === highlightType}
        />
      ))}
    </ul>
  );
}

function ThresholdItem({
  row,
  isHighlighted,
}: {
  row: ThresholdRow;
  isHighlighted: boolean;
}) {
  const Icon = EVENT_ICONS[row.type];
  return (
    <li
      className={cn(
        "grid grid-cols-1 gap-3 py-4 transition-all duration-200 first:pt-0 last:pb-0 sm:grid-cols-[150px_minmax(0,1fr)_minmax(0,1fr)] sm:items-center sm:gap-6",
        isHighlighted && "rounded-xl",
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "rounded-lg p-2",
            isHighlighted
              ? "bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/40"
              : "bg-zinc-800 text-zinc-300",
          )}
        >
          <Icon className="size-4" aria-hidden />
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-100">
            {EVENT_TYPE_LABELS[row.type]}
          </p>
          <p className="text-xs text-zinc-500">
            {pluralize(row.labels, "label")}
          </p>
        </div>
      </div>
      <Meter
        label="False-alarm rate"
        value={row.falseAlarmRate}
        display={formatPercent(row.falseAlarmRate)}
        fillClassName="bg-zinc-400"
      />
      <Meter
        label="Alert threshold"
        value={row.threshold}
        display={formatConfidence(row.threshold)}
        fillClassName="bg-indigo-400"
        isHighlighted={isHighlighted}
      />
    </li>
  );
}

export function Meter({
  label,
  value,
  display,
  fillClassName,
  isHighlighted = false,
}: {
  label: string;
  value: number;
  display: string;
  fillClassName: string;
  isHighlighted?: boolean;
}) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-zinc-500">{label}</span>
        <motion.span
          key={display}
          initial={
            shouldReduceMotion || !isHighlighted ? false : { scale: 1.4 }
          }
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 18 }}
          className={cn(
            "font-mono font-semibold tabular-nums",
            isHighlighted ? "text-indigo-200" : "text-zinc-200",
          )}
        >
          {display}
        </motion.span>
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={1}
        aria-valuenow={value}
        aria-valuetext={display}
        className="h-1.5 overflow-hidden rounded-full bg-zinc-800"
      >
        <motion.div
          className={cn("h-full rounded-full", fillClassName)}
          initial={shouldReduceMotion ? false : { width: 0 }}
          animate={{ width: `${value * 100}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
