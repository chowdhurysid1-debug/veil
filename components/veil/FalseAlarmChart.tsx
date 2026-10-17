"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "cn";

import type { LearningStats } from "@/lib/contracts";

import { formatDay, formatPercent } from "./format";

type HistoryPoint = LearningStats["history"][number];

const HEIGHT = 220;
const MARGIN = { top: 16, right: 52, bottom: 28, left: 40 };
const LINE_COLOR = "#818cf8"; // indigo-400, 6:1 on the zinc-900 card
const SURFACE_COLOR = "#18181b"; // zinc-900, the card surface
const GRID_COLOR = "#27272a"; // zinc-800

function niceMax(values: number[]) {
  const max = Math.max(0.25, ...values);
  return Math.min(1, Math.ceil(max / 0.25) * 0.25);
}

/** False-alarm rate across all sites, one point per day. Single series. */
export function FalseAlarmChart({ history }: { history: HistoryPoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [view, setView] = useState<"chart" | "table">("chart");
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.floor(entry.contentRect.width));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [view]);

  const yMax = niceMax(history.map((point) => point.falseAlarmRate));
  const ticks = Array.from(
    { length: Math.round(yMax / 0.25) + 1 },
    (_, index) => index * 0.25,
  );
  const plotWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const x = (index: number) =>
    MARGIN.left +
    (history.length <= 1
      ? plotWidth / 2
      : (index / (history.length - 1)) * plotWidth);
  const y = (value: number) => MARGIN.top + plotHeight * (1 - value / yMax);

  const points = history.map((point, index) => ({
    ...point,
    cx: x(index),
    cy: y(point.falseAlarmRate),
  }));
  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.cx},${point.cy}`)
    .join(" ");
  const areaPath =
    points.length > 0
      ? `${linePath} L${points.at(-1)?.cx},${y(0)} L${points[0].cx},${y(0)} Z`
      : "";
  const last = points.at(-1);
  const active = activeIndex === null ? null : points[activeIndex];
  const showEveryDayLabel = plotWidth / Math.max(1, history.length) > 56;

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    if (points.length === 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    let nearest = 0;
    points.forEach((point, index) => {
      if (
        Math.abs(point.cx - pointerX) < Math.abs(points[nearest].cx - pointerX)
      ) {
        nearest = index;
      }
    });
    setActiveIndex(nearest);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const step = event.key === "ArrowLeft" ? -1 : 1;
    setActiveIndex((current) =>
      Math.min(
        history.length - 1,
        Math.max(0, (current ?? history.length - 1) + step),
      ),
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <div
          role="group"
          aria-label="Show history as"
          className="inline-flex rounded-lg bg-zinc-950/60 p-0.5 ring-1 ring-zinc-800"
        >
          {(["chart", "table"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={view === option}
              onClick={() => setView(option)}
              className={cn(
                "h-8 cursor-pointer rounded-md px-3 text-xs font-medium capitalize outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-indigo-500",
                view === option
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:text-white",
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {view === "table" ? (
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Running false-alarm rate by day</caption>
          <thead>
            <tr className="border-b border-zinc-800 text-xs text-zinc-500">
              <th scope="col" className="py-2 font-medium">
                Day
              </th>
              <th scope="col" className="py-2 text-right font-medium">
                False-alarm rate
              </th>
            </tr>
          </thead>
          <tbody>
            {history.map((point) => (
              <tr key={point.date} className="border-b border-zinc-800/60">
                <td className="py-2 text-zinc-300">{formatDay(point.date)}</td>
                <td className="py-2 text-right font-mono text-zinc-100 tabular-nums">
                  {formatPercent(point.falseAlarmRate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div
          ref={containerRef}
          tabIndex={0}
          role="img"
          aria-label={`Running false-alarm rate by day, from ${formatPercent(history[0]?.falseAlarmRate ?? 0)} on ${history[0] ? formatDay(history[0].date) : ""} to ${formatPercent(last?.falseAlarmRate ?? 0)} on ${last ? formatDay(last.date) : ""}. Use the arrow keys to read each day.`}
          onKeyDown={handleKeyDown}
          onFocus={() => setActiveIndex(history.length - 1)}
          onBlur={() => setActiveIndex(null)}
          className="relative h-[220px] w-full rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          {width > 0 && (
            <svg
              width={width}
              height={HEIGHT}
              onPointerMove={handlePointerMove}
              onPointerLeave={() => setActiveIndex(null)}
              className="block touch-pan-y"
              aria-hidden
            >
              {ticks.map((tick) => (
                <g key={tick}>
                  <line
                    x1={MARGIN.left}
                    x2={width - MARGIN.right}
                    y1={y(tick)}
                    y2={y(tick)}
                    stroke={GRID_COLOR}
                    strokeWidth={1}
                  />
                  <text
                    x={MARGIN.left - 8}
                    y={y(tick)}
                    textAnchor="end"
                    dominantBaseline="middle"
                    className="fill-zinc-500 text-[11px] tabular-nums"
                  >
                    {formatPercent(tick)}
                  </text>
                </g>
              ))}

              {points.map((point, index) =>
                showEveryDayLabel ||
                index === 0 ||
                index === points.length - 1 ? (
                  <text
                    key={point.date}
                    x={point.cx}
                    y={HEIGHT - 8}
                    textAnchor={
                      !showEveryDayLabel && index === 0
                        ? "start"
                        : !showEveryDayLabel && index === points.length - 1
                          ? "end"
                          : "middle"
                    }
                    className="fill-zinc-500 text-[11px]"
                  >
                    {formatDay(point.date)}
                  </text>
                ) : null,
              )}

              <motion.path
                d={areaPath}
                fill={LINE_COLOR}
                fillOpacity={0.1}
                initial={shouldReduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              />
              <motion.path
                d={linePath}
                fill="none"
                stroke={LINE_COLOR}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={shouldReduceMotion ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.9, ease: "easeOut" }}
              />

              {active && (
                <line
                  x1={active.cx}
                  x2={active.cx}
                  y1={MARGIN.top}
                  y2={y(0)}
                  stroke="#52525b"
                  strokeWidth={1}
                />
              )}

              {last && (
                <>
                  <circle
                    cx={last.cx}
                    cy={last.cy}
                    r={5}
                    fill={LINE_COLOR}
                    stroke={SURFACE_COLOR}
                    strokeWidth={2}
                  />
                  <text
                    x={last.cx + 10}
                    y={last.cy}
                    dominantBaseline="middle"
                    className="fill-zinc-100 text-xs font-semibold tabular-nums"
                  >
                    {formatPercent(last.falseAlarmRate)}
                  </text>
                </>
              )}
              {active && active !== last && (
                <circle
                  cx={active.cx}
                  cy={active.cy}
                  r={5}
                  fill={LINE_COLOR}
                  stroke={SURFACE_COLOR}
                  strokeWidth={2}
                />
              )}
            </svg>
          )}

          {active && (
            <div
              className="pointer-events-none absolute top-0 z-10 flex -translate-x-1/2 flex-col gap-0.5 rounded-lg border border-zinc-700 bg-zinc-950/95 px-3 py-2 shadow-xl"
              style={{
                left: Math.min(
                  Math.max(active.cx, 60),
                  Math.max(60, width - 60),
                ),
              }}
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-white tabular-nums">
                <span
                  aria-hidden
                  className="h-0.5 w-3 rounded-full"
                  style={{ backgroundColor: LINE_COLOR }}
                />
                {formatPercent(active.falseAlarmRate)}
              </span>
              <span className="text-xs text-zinc-400">
                false alarms, {formatDay(active.date)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
