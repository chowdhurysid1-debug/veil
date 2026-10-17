"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import {
  ArrowUpRight,
  BrainCircuit,
  Cctv,
  ChevronsLeftRight,
  FileVideo,
  Laptop,
  Lock,
  ScrollText,
  Server,
  UserCheck,
} from "lucide-react";
import { cn } from "cn";

import { CountUp } from "@/components/veil/CountUp";
import { FrameImage } from "@/components/veil/FrameImage";
import { EASE_VEIL } from "@/components/veil/motion";
import { veilApi } from "@/components/veil/api";
import { useVeilQuery } from "@/components/veil/useVeilQuery";

import {
  FEED_FRAMES,
  HALLWAY_CROP,
  STILL,
  STILL_BBOX,
  STILL_FRAME_INDEX,
  boxInCrop,
} from "./frames";

type Icon = ComponentType<{ className?: string }>;

// Frames 4 to 16: the person walks in, crouches, and walks out.
const FEED_START = 4;
const FEED_END = 16;

/** A looping hallway feed with a face lock that tracks the person. */
export function CctvFeed({
  fps = 3,
  className,
}: {
  fps?: number;
  className?: string;
}) {
  const shouldReduceMotion = useReducedMotion();
  const [frame, setFrame] = useState(FEED_START);

  useEffect(() => {
    if (shouldReduceMotion) return;
    const interval = setInterval(() => {
      setFrame((current) => (current >= FEED_END ? FEED_START : current + 1));
    }, 1000 / fps);
    return () => clearInterval(interval);
  }, [fps, shouldReduceMotion]);

  const current = shouldReduceMotion ? STILL_FRAME_INDEX : frame;
  const bbox = FEED_FRAMES[current].bbox;

  return (
    <div
      className={cn(
        "relative aspect-video overflow-hidden border border-hairline-strong bg-panel",
        className,
      )}
    >
      {FEED_FRAMES.map((feedFrame, index) =>
        index < FEED_START || index > FEED_END ? null : (
          <FrameImage
            key={index}
            src={feedFrame.src}
            alt=""
            priority={index === FEED_START}
            className={cn(
              "absolute inset-0",
              index === current ? "opacity-100" : "opacity-0",
            )}
          />
        ),
      )}
      <div className="scanlines absolute inset-0" />
      {bbox && (
        <div
          className="absolute border border-ink transition-all duration-300 ease-linear"
          style={{
            left: `${bbox.x * 100}%`,
            top: `${bbox.y * 100}%`,
            width: `${bbox.width * 100}%`,
            height: `${bbox.height * 100}%`,
          }}
        >
          <span className="absolute -top-5 left-[-1px] flex items-center gap-1 bg-ink px-1.5 py-0.5 font-mono text-[0.55rem] tracking-[0.14em] text-void uppercase">
            <Lock className="size-2.5" aria-hidden />
            Locked
          </span>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 bg-gradient-to-t from-void/90 to-transparent px-4 pt-10 pb-3">
        <FeedReadout label="Faces in view" value={bbox ? "01" : "00"} />
        <FeedReadout label="Stored in the clear" value="00" />
        <FeedReadout label="Model input" value="Blurred" />
      </div>
    </div>
  );
}

function FeedReadout({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex flex-col gap-0.5">
      <span className="font-mono text-[0.55rem] tracking-[0.14em] text-ink-muted uppercase">
        {label}
      </span>
      <span className="font-mono text-sm text-ink uppercase tabular-nums md:text-base">
        {value}
      </span>
    </span>
  );
}

const BREACH_COLUMNS = 60;
const BREACH_ROWS = 25;
const BREACH_DOTS = BREACH_COLUMNS * BREACH_ROWS;
const CAMERAS_PER_DOT = 100;
const BREACH_MS = 2600;
const BREACH_DELAY_MS = 700;

/** Seeded shuffle so the breach spreads the same way every time. */
function breachOrder(): number[] {
  const order = Array.from({ length: BREACH_DOTS }, (_, index) => index);
  let seed = 7;
  for (let index = order.length - 1; index > 0; index--) {
    seed = (seed * 16807) % 2147483647;
    const swap = seed % (index + 1);
    [order[index], order[swap]] = [order[swap], order[index]];
  }
  return order;
}

const BREACH_ORDER = breachOrder();

/** 1,500 dots, 100 cameras each, lighting up as the breach spreads. */
export function BreachField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const styles = getComputedStyle(document.documentElement);
    const lit = styles.getPropertyValue("--color-signal").trim() || "#ffb000";
    const unlit =
      styles.getPropertyValue("--color-hairline-strong").trim() || "#3a3a36";
    const breachedIndex = new Int32Array(BREACH_DOTS);
    BREACH_ORDER.forEach((dot, rank) => {
      breachedIndex[dot] = rank;
    });

    let frame = 0;
    let start: number | null = null;

    const draw = (litCount: number) => {
      const ratio = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const spacing = width / BREACH_COLUMNS;
      const height = spacing * BREACH_ROWS;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);
      const radius = Math.max(1, spacing * 0.22);
      for (let dot = 0; dot < BREACH_DOTS; dot++) {
        const isLit = breachedIndex[dot] < litCount;
        context.fillStyle = isLit ? lit : unlit;
        context.beginPath();
        context.arc(
          (dot % BREACH_COLUMNS) * spacing + spacing / 2,
          Math.floor(dot / BREACH_COLUMNS) * spacing + spacing / 2,
          isLit ? radius * 1.25 : radius,
          0,
          Math.PI * 2,
        );
        context.fill();
      }
      if (counterRef.current) {
        counterRef.current.textContent = (
          litCount * CAMERAS_PER_DOT
        ).toLocaleString("en-US");
      }
    };

    if (shouldReduceMotion) {
      draw(BREACH_DOTS);
      return;
    }

    const step = (now: number) => {
      start ??= now;
      const progress = Math.min(
        1,
        Math.max(0, (now - start - BREACH_DELAY_MS) / BREACH_MS),
      );
      const eased = 1 - Math.pow(1 - progress, 3);
      draw(Math.round(eased * BREACH_DOTS));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);

    const observer = new ResizeObserver(() => {
      if (start === null) return;
      const elapsed = performance.now() - start - BREACH_DELAY_MS;
      if (elapsed >= BREACH_MS) draw(BREACH_DOTS);
    });
    observer.observe(canvas);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [shouldReduceMotion]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-4">
        <span
          ref={counterRef}
          className="font-display text-counter font-bold tracking-tight text-signal tabular-nums"
        >
          0
        </span>
        <span className="label-mono text-right">Cameras breached, live</span>
      </div>
      <canvas
        ref={canvasRef}
        className="w-full"
        role="img"
        aria-label="1,500 dots, each standing for 100 cameras, all lit: 150,000 cameras breached"
      />
      <span className="label-mono">
        Each dot is 100 cameras. Schools, hospitals, prisons. March 2021.
      </span>
    </div>
  );
}

/** Two settlements as bars to scale. */
export function SettlementBars({
  rows,
}: {
  rows: {
    value: number;
    prefix: string;
    suffix: string;
    label: string;
    decimals?: number;
    scale: number;
  }[];
}) {
  return (
    <div className="flex flex-col gap-6">
      {rows.map((row, index) => (
        <div key={row.label} className="flex flex-col gap-2">
          <span className="font-display text-5xl font-bold tracking-tight text-ink tabular-nums md:text-6xl">
            {row.prefix}
            <CountUp value={row.value} decimals={row.decimals ?? 0} />
            {row.suffix}
          </span>
          <span className="relative h-2 w-full bg-panel-2">
            <motion.span
              className="absolute inset-y-0 left-0 bg-ink"
              initial={{ width: 0 }}
              animate={{ width: `${row.scale * 100}%` }}
              transition={{
                duration: 1.4,
                ease: EASE_VEIL,
                delay: 0.6 + index * 0.2,
              }}
            />
          </span>
          <span className="text-sm text-ink-muted">{row.label}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Drag to compare: what every other system stores on the left, what Veil
 * stores on the right. Sweeps once on its own to show it can be dragged.
 */
export function FaceSlider() {
  const position = useMotionValue(78);
  const clip = useTransform(
    position,
    (value) => `inset(0 ${100 - value}% 0 0)`,
  );
  const handleLeft = useTransform(position, (value) => `${value}%`);
  const [rangeValue, setRangeValue] = useState(78);
  const shouldReduceMotion = useReducedMotion();
  const sweep = useRef<ReturnType<typeof animate> | null>(null);
  const box = boxInCrop(STILL_BBOX, HALLWAY_CROP);

  useMotionValueEvent(position, "change", (value) =>
    setRangeValue(Math.round(value)),
  );

  useEffect(() => {
    if (shouldReduceMotion) {
      position.set(50);
      return;
    }
    sweep.current = animate(position, [78, 30, 52], {
      duration: 3.2,
      delay: 1,
      ease: EASE_VEIL,
      times: [0, 0.55, 1],
    });
    return () => sweep.current?.stop();
  }, [position, shouldReduceMotion]);

  return (
    <div className="relative aspect-[26/17] w-full overflow-hidden border border-hairline-strong bg-panel select-none">
      <FrameImage src={STILL.blurred} alt="" className="absolute inset-0" />
      <div
        className="absolute flex flex-col items-center"
        style={{
          left: `${box.left}%`,
          top: `${box.top}%`,
          width: `${box.width}%`,
          height: `${box.height}%`,
        }}
      >
        <span className="size-full border border-signal" />
        <span className="mt-1.5 flex items-center gap-1 bg-signal px-1.5 py-0.5 font-mono text-[0.55rem] tracking-[0.14em] whitespace-nowrap text-void uppercase">
          <Lock className="size-2.5" aria-hidden />
          AES-GCM / key 7f3a
        </span>
      </div>
      <motion.div className="absolute inset-0" style={{ clipPath: clip }}>
        <FrameImage src={STILL.clear} alt="" className="absolute inset-0" />
        <span className="label-mono absolute top-3 left-3 bg-void/80 px-2 py-1 text-ink">
          Every other camera: face stored
        </span>
      </motion.div>
      <span className="label-mono absolute top-3 right-3 bg-void/80 px-2 py-1 text-signal">
        Veil: face locked
      </span>
      <div className="scanlines pointer-events-none absolute inset-0" />
      <motion.div
        className="pointer-events-none absolute inset-y-0 w-px -translate-x-1/2 bg-ink"
        style={{ left: handleLeft }}
      >
        <span className="absolute top-1/2 left-1/2 flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-ink bg-void text-ink">
          <ChevronsLeftRight className="size-4" aria-hidden />
        </span>
      </motion.div>
      <input
        type="range"
        min={0}
        max={100}
        value={rangeValue}
        aria-label="Compare stored footage: drag left for Veil, right for a regular camera"
        onPointerDown={() => sweep.current?.stop()}
        onKeyDown={() => sweep.current?.stop()}
        onChange={(event) => position.set(Number(event.target.value))}
        className="absolute inset-0 size-full cursor-ew-resize opacity-0"
      />
    </div>
  );
}

const IFRAME_WIDTH = 1280;
const IFRAME_HEIGHT = 800;

/** The real console, running inside the slide, scaled to fit. */
export function ConsoleEmbed({ href }: { href: string }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const [loadedHref, setLoadedHref] = useState<string | null>(null);

  useEffect(() => {
    const element = frameRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setScale(entry.contentRect.width / IFRAME_WIDTH);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const isLoading = loadedHref !== href;

  return (
    <div className="flex flex-col border border-hairline-strong bg-panel shadow-[0_40px_120px_-40px_rgb(255_176_0/0.25)]">
      <div className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-2.5">
        <span className="flex items-center gap-2">
          <span className="size-1.5 animate-veil-blink rounded-full bg-signal" />
          <span className="label-mono text-ink">Live console</span>
          <span className="label-mono hidden sm:inline">veil{href}</span>
        </span>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="label-mono inline-flex cursor-pointer items-center gap-1 transition-colors duration-500 ease-veil hover:text-ink"
        >
          New tab
          <ArrowUpRight className="size-3.5" aria-hidden />
        </a>
      </div>
      <div
        ref={frameRef}
        className="relative w-full overflow-hidden"
        style={{ height: IFRAME_HEIGHT * scale }}
      >
        <iframe
          key={href}
          src={href}
          title="Veil console, running live"
          onLoad={() => setLoadedHref(href)}
          className="absolute top-0 left-0 origin-top-left border-0"
          style={{
            width: IFRAME_WIDTH,
            height: IFRAME_HEIGHT,
            transform: `scale(${scale})`,
          }}
        />
        {isLoading && (
          <div className="absolute inset-0 flex flex-col gap-3 bg-panel p-6">
            <div className="h-6 w-1/3 animate-pulse bg-panel-2" />
            <div className="h-40 animate-pulse bg-panel-2" />
            <div className="h-6 w-2/3 animate-pulse bg-panel-2" />
          </div>
        )}
      </div>
    </div>
  );
}

const FLOW_STATIONS: { name: string; line: string; icon: Icon }[] = [
  { name: "Browser", line: "Blur, encrypt, hash", icon: Laptop },
  { name: "Server", line: "Ciphertext only", icon: Server },
  { name: "Model", line: "Reads blurred frames", icon: BrainCircuit },
  { name: "Officer", line: "Labels and unlocks", icon: UserCheck },
];
const FLOW_STEP_MS = 1500;

/** One frame's journey. The face locks before it crosses the privacy line. */
export function DataFlow() {
  const shouldReduceMotion = useReducedMotion();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (shouldReduceMotion) return;
    const interval = setInterval(
      () => setStep((current) => (current + 1) % FLOW_STATIONS.length),
      FLOW_STEP_MS,
    );
    return () => clearInterval(interval);
  }, [shouldReduceMotion]);

  const isLocked = step > 0;

  return (
    <div className="relative grid grid-cols-4 gap-2 pt-24 md:gap-4">
      <div className="absolute top-[7.5rem] right-[12.5%] left-[12.5%] h-px bg-hairline-strong" />
      <div className="absolute top-12 bottom-0 left-1/4 w-px border-l border-dashed border-signal/70">
        <span className="label-mono absolute top-0 left-2 hidden whitespace-nowrap text-signal md:block">
          Privacy line
        </span>
      </div>
      <motion.div
        className="absolute top-[5.5rem] z-10 -translate-x-1/2"
        animate={{ left: `${12.5 + step * 25}%` }}
        transition={{ duration: 0.9, ease: EASE_VEIL }}
      >
        <div className="relative size-16 overflow-hidden border border-ink bg-panel">
          <FrameImage
            src={isLocked ? STILL.headBlurred : STILL.headClear}
            alt=""
            className="absolute inset-0"
          />
          {isLocked && (
            <span className="absolute right-0 bottom-0 bg-ink p-1 text-void">
              <Lock className="size-3" aria-hidden />
            </span>
          )}
        </div>
        {step === 2 && (
          <motion.span
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute -top-8 left-1/2 -translate-x-1/2 bg-signal px-2 py-1 font-mono text-[0.6rem] tracking-[0.14em] whitespace-nowrap text-void uppercase"
          >
            Fall 0.71
          </motion.span>
        )}
        {step === 3 && (
          <motion.span
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute -top-8 left-1/2 -translate-x-1/2 border border-signal bg-void px-2 py-1 font-mono text-[0.6rem] tracking-[0.14em] whitespace-nowrap text-signal uppercase"
          >
            False alarm
          </motion.span>
        )}
      </motion.div>
      {FLOW_STATIONS.map(({ name, line, icon: StationIcon }, index) => (
        <div
          key={name}
          className="relative flex flex-col items-center gap-3 pt-12 text-center"
        >
          <span
            className={cn(
              "flex size-12 items-center justify-center border transition-colors duration-500 ease-veil",
              step === index
                ? "border-ink bg-ink text-void"
                : "border-hairline-strong bg-void text-ink-muted",
            )}
          >
            <StationIcon className="size-5" />
          </span>
          <span className="font-display text-base font-bold uppercase md:text-title">
            {name}
          </span>
          <span className="hidden text-sm text-ink-muted md:block">{line}</span>
        </div>
      ))}
    </div>
  );
}

const NETWORK_NODES = [
  "School",
  "Store",
  "Hospital",
  "School",
  "Store",
  "School",
] as const;
const NETWORK_CYCLE_MS = 3200;

function nodePosition(index: number) {
  const angle = (index / NETWORK_NODES.length) * Math.PI * 2 - Math.PI / 2;
  return { x: 200 + Math.cos(angle) * 160, y: 150 + Math.sin(angle) * 112 };
}

/** One site labels a false alarm; the hub passes it to every other site. */
export function LabelNetwork() {
  const shouldReduceMotion = useReducedMotion();
  const [cycle, setCycle] = useState(0);
  const { state } = useVeilQuery("learning", veilApi.getLearningStats);

  useEffect(() => {
    if (shouldReduceMotion) return;
    const interval = setInterval(
      () => setCycle((current) => current + 1),
      NETWORK_CYCLE_MS,
    );
    return () => clearInterval(interval);
  }, [shouldReduceMotion]);

  const source = cycle % NETWORK_NODES.length;
  const sourcePoint = nodePosition(source);
  const live =
    state.status === "success"
      ? `${state.data.totalLabels} labels across ${state.data.sitesContributing} sites, live`
      : "Seed: 20 labels across 2 sites";

  return (
    <div className="flex flex-col gap-3">
      <svg
        viewBox="0 0 400 300"
        className="w-full"
        role="img"
        aria-label="Diagram: one site's label travels to a shared hub and on to every other site"
      >
        {NETWORK_NODES.map((_, index) => {
          const point = nodePosition(index);
          return (
            <line
              key={`base-${index}`}
              x1={200}
              y1={150}
              x2={point.x}
              y2={point.y}
              stroke="var(--color-hairline-strong)"
              strokeWidth={1}
            />
          );
        })}
        <motion.path
          key={`in-${cycle}`}
          d={`M${sourcePoint.x} ${sourcePoint.y}L200 150`}
          stroke="var(--color-signal)"
          strokeWidth={2}
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.7, ease: EASE_VEIL }}
        />
        {NETWORK_NODES.map((_, index) => {
          if (index === source) return null;
          const point = nodePosition(index);
          return (
            <motion.path
              key={`out-${cycle}-${index}`}
              d={`M200 150L${point.x} ${point.y}`}
              stroke="var(--color-signal)"
              strokeWidth={1.5}
              fill="none"
              initial={{ pathLength: 0, opacity: 1 }}
              animate={{ pathLength: 1, opacity: [1, 1, 0.35] }}
              transition={{ duration: 1.4, delay: 0.85, ease: EASE_VEIL }}
            />
          );
        })}
        <motion.circle
          key={`hub-${cycle}`}
          cx={200}
          cy={150}
          r={26}
          fill="none"
          stroke="var(--color-signal)"
          initial={{ r: 26, opacity: 0.9 }}
          animate={{ r: 70, opacity: 0 }}
          transition={{ duration: 1.2, delay: 0.7 }}
        />
        <circle
          cx={200}
          cy={150}
          r={26}
          fill="var(--color-panel)"
          stroke="var(--color-ink)"
        />
        <text
          x={200}
          y={147}
          textAnchor="middle"
          className="fill-ink font-mono text-[7px] tracking-[0.14em] uppercase"
        >
          Shared
        </text>
        <text
          x={200}
          y={157}
          textAnchor="middle"
          className="fill-ink font-mono text-[7px] tracking-[0.14em] uppercase"
        >
          threshold
        </text>
        {NETWORK_NODES.map((kind, index) => {
          const point = nodePosition(index);
          const isSource = index === source;
          return (
            <g key={`node-${index}`}>
              <circle
                cx={point.x}
                cy={point.y}
                r={isSource ? 9 : 7}
                fill={isSource ? "var(--color-signal)" : "var(--color-panel)"}
                stroke={
                  isSource ? "var(--color-signal)" : "var(--color-ink-muted)"
                }
              />
              <text
                x={point.x}
                y={point.y + (point.y > 150 ? 24 : -16)}
                textAnchor="middle"
                className={cn(
                  "font-mono text-[8px] tracking-[0.14em] uppercase",
                  isSource ? "fill-signal" : "fill-ink-dim",
                )}
              >
                {isSource ? "False alarm" : kind}
              </text>
            </g>
          );
        })}
      </svg>
      <span className="label-mono text-center">Illustration / {live}</span>
    </div>
  );
}

const TERMINAL_SCRIPT: { kind: "command" | "output" | "pass"; text: string }[] =
  [
    { kind: "command", text: "npm test" },
    { kind: "output", text: "Test Files  30 passed (30)" },
    { kind: "pass", text: "Tests  207 passed (207)" },
    { kind: "command", text: "npm run evals" },
    {
      kind: "output",
      text: "demo-1 shoe-tie, first time    fall 0.70 / 0.58   flagged",
    },
    {
      kind: "output",
      text: "demo-2 shoe-tie, after label   fall 0.20 / 0.60   quiet",
    },
    {
      kind: "output",
      text: "demo-3 real fall, after label  fall 0.93 / 0.60   flagged",
    },
    {
      kind: "output",
      text: "fight, shoving                 fight 0.93 / 0.50  flagged",
    },
    {
      kind: "output",
      text: "fire, trash can                fire 0.97 / 0.47   flagged",
    },
    { kind: "pass", text: "11 of 11 cases passed. Recall 1.00 on every type." },
  ];
const TYPE_MS = 45;
const OUTPUT_MS = 140;
const TERMINAL_DELAY_MS = 600;

function terminalTimeline() {
  let time = TERMINAL_DELAY_MS;
  return TERMINAL_SCRIPT.map((line) => {
    const start = time;
    time +=
      line.kind === "command" ? line.text.length * TYPE_MS + 300 : OUTPUT_MS;
    return start;
  });
}

const TERMINAL_STARTS = terminalTimeline();
const TERMINAL_END = (TERMINAL_STARTS.at(-1) ?? 0) + OUTPUT_MS;

/** Types out the real test and eval results. */
export function Terminal() {
  const shouldReduceMotion = useReducedMotion();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (shouldReduceMotion) return;
    const startedAt = performance.now();
    const interval = setInterval(() => {
      const now = performance.now() - startedAt;
      setElapsed(now);
      if (now > TERMINAL_END) clearInterval(interval);
    }, 30);
    return () => clearInterval(interval);
  }, [shouldReduceMotion]);

  const time = shouldReduceMotion ? TERMINAL_END : elapsed;

  return (
    <div className="flex flex-col border border-hairline-strong bg-panel">
      <div className="flex items-center gap-2 border-b border-hairline px-4 py-2.5">
        <span className="size-2 rounded-full bg-hairline-strong" />
        <span className="size-2 rounded-full bg-hairline-strong" />
        <span className="size-2 rounded-full bg-hairline-strong" />
        <span className="label-mono ml-2">veil / main</span>
      </div>
      <pre className="min-h-[19rem] overflow-x-auto px-4 py-4 font-mono text-[0.7rem] leading-relaxed md:text-xs">
        {TERMINAL_SCRIPT.map((line, index) => {
          const start = TERMINAL_STARTS[index];
          if (time < start) return null;
          const text =
            line.kind === "command"
              ? line.text.slice(0, Math.floor((time - start) / TYPE_MS))
              : line.text;
          return (
            <div
              key={line.text}
              className={cn(
                line.kind === "command" && "mt-2 text-ink first:mt-0",
                line.kind === "output" && "text-ink-muted",
                line.kind === "pass" && "text-signal",
              )}
            >
              {line.kind === "command" && (
                <span className="text-ink-dim">$ </span>
              )}
              {text}
            </div>
          );
        })}
        {time < TERMINAL_END && (
          <span className="inline-block h-3.5 w-2 animate-veil-blink bg-ink align-middle" />
        )}
      </pre>
    </div>
  );
}

/** 100 squares, one per percent of US public schools. 93 light up. */
export function SchoolUnits({ lit = 93 }: { lit?: number }) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <div className="flex flex-col gap-3">
      <div
        className="grid grid-cols-10 gap-1"
        role="img"
        aria-label={`${lit} of 100 squares lit: ${lit}% of US public schools use security cameras`}
      >
        {Array.from({ length: 100 }, (_, index) => (
          <motion.span
            key={index}
            className={cn(
              "aspect-square border",
              index < lit ? "border-ink bg-ink" : "border-hairline-strong",
            )}
            initial={
              shouldReduceMotion || index >= lit
                ? false
                : { opacity: 0, scale: 0.4 }
            }
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.6 + index * 0.012 }}
          />
        ))}
      </div>
      <span className="label-mono">Each square is 1% of US public schools</span>
    </div>
  );
}

/** The surveillance market today and in 2030, bars to scale. */
export function MarketBars() {
  const bars = [
    { year: "2025", value: 35.5 },
    { year: "2030", value: 47.9 },
  ];
  const max = 47.9;
  return (
    <div className="flex h-72 items-end gap-6">
      {bars.map((bar, index) => (
        <div
          key={bar.year}
          className="flex h-full flex-1 flex-col justify-end gap-3"
        >
          <span className="font-display text-4xl font-bold tracking-tight text-ink tabular-nums md:text-5xl">
            $<CountUp value={bar.value} decimals={1} />B
          </span>
          <motion.span
            className={cn(
              "w-full origin-bottom",
              index === 1 ? "bg-ink" : "bg-ink-muted",
            )}
            style={{ height: `${(bar.value / max) * 70}%` }}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{
              duration: 1.3,
              ease: EASE_VEIL,
              delay: 0.7 + index * 0.25,
            }}
          />
          <span className="label-mono">{bar.year}</span>
        </div>
      ))}
    </div>
  );
}

const CIPHERTEXT =
  "7f3a 91c2 0be4 5d17 a8f0 3c6e 92d1 4b07 e5a3 1f8c 6d20 b9e7 0a4f c3d8 5e61 82b9";

/**
 * Exploded view of what a system keeps: the screen layer on top, the disk
 * layer underneath. The layers lift apart to show the difference.
 */
export function LayerStack({ variant }: { variant: "veil" | "other" }) {
  const shouldReduceMotion = useReducedMotion();
  const isVeil = variant === "veil";
  return (
    <div className="flex flex-col gap-5">
      <div className="relative h-56 [perspective:1100px] md:h-64">
        <div className="absolute inset-x-6 top-6 bottom-0 [transform:rotateX(52deg)_rotateZ(-32deg)] [transform-style:preserve-3d]">
          <div className="absolute inset-0 flex items-center justify-center border border-hairline-strong bg-panel-2">
            {isVeil ? (
              <span className="flex flex-col items-center gap-2 p-3">
                <Lock className="size-6 text-signal" aria-hidden />
                <span className="line-clamp-3 max-w-[14rem] text-center font-mono text-[0.55rem] leading-relaxed break-all text-signal/80">
                  {CIPHERTEXT}
                </span>
              </span>
            ) : (
              <span className="relative size-24 overflow-hidden border border-ink">
                <FrameImage
                  src={STILL.headClear}
                  alt=""
                  className="absolute inset-0"
                />
              </span>
            )}
          </div>
          <motion.div
            className="absolute inset-0 flex items-center justify-center border border-ink/60 bg-void/85"
            initial={shouldReduceMotion ? false : { z: 0 }}
            animate={{ z: 90 }}
            transition={{ duration: 1.4, ease: EASE_VEIL, delay: 0.8 }}
          >
            <span className="relative size-24 overflow-hidden border border-hairline-strong">
              <FrameImage
                src={STILL.headBlurred}
                alt=""
                className="absolute inset-0"
              />
            </span>
          </motion.div>
        </div>
      </div>
      <dl className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-3 gap-y-2 border-t border-hairline pt-4">
        <dt className="label-mono">Screen</dt>
        <dd className="text-sm text-ink">Blurred</dd>
        <dt className="label-mono">Disk</dt>
        <dd className={cn("text-sm", isVeil ? "text-signal" : "text-ink")}>
          {isVeil ? "Encrypted, one key per face" : "Real faces"}
        </dd>
        <dt className="label-mono">Cameras</dt>
        <dd className="text-sm text-ink">
          {isVeil ? "Any camera that exports video" : "Verkada hardware only"}
        </dd>
      </dl>
    </div>
  );
}

const CHAIN: { label: string; icon: Icon }[] = [
  { label: "Cameras they own", icon: Cctv },
  { label: "Video file", icon: FileVideo },
  { label: "Veil", icon: Lock },
  { label: "Audit log and stamps", icon: ScrollText },
];

/** Hardware they already have, flowing into Veil and out as a record. */
export function ValueChain() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-[repeat(4,minmax(0,1fr))] sm:gap-0">
      {CHAIN.map(({ label, icon: ChainIcon }, index) => (
        <div
          key={label}
          className="relative flex items-center gap-4 sm:flex-col sm:gap-4"
        >
          {index < CHAIN.length - 1 && (
            <span className="absolute top-8 left-[calc(50%+2.5rem)] hidden h-px w-[calc(100%-5rem)] bg-hairline-strong sm:block">
              <span
                className="pitch-travel absolute -top-[3px] size-[7px] rounded-full bg-signal"
                style={{ animationDelay: `${index * 0.6}s` }}
              />
            </span>
          )}
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 0.6,
              ease: EASE_VEIL,
              delay: 0.5 + index * 0.15,
            }}
            className={cn(
              "flex size-16 shrink-0 items-center justify-center border",
              index === 2
                ? "border-ink bg-ink text-void"
                : "border-hairline-strong text-ink",
            )}
          >
            <ChainIcon className="size-6" />
          </motion.span>
          <span className="label-mono text-ink sm:text-center">{label}</span>
        </div>
      ))}
    </div>
  );
}
