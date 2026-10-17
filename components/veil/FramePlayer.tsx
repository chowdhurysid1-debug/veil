"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import {
  ChevronLeft,
  ChevronRight,
  LockKeyhole,
  Pause,
  Play,
} from "lucide-react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import type { ClipDetail, ClipEvent, ClipFrame } from "@/lib/contracts";

import { EVENT_MARKER_CLASSES, eventStatus } from "./eventStyles";
import { EVENT_TYPE_LABELS, formatClipTime } from "./format";
import { FrameImage } from "./FrameImage";

const PLAYBACK_MS = 700;

export type LockedFaceSummary = ClipDetail["faces"][number];

interface FramePlayerProps {
  frames: ClipFrame[];
  events: ClipEvent[];
  faces: LockedFaceSummary[];
  currentIndex: number;
  onSeek: (index: number) => void;
  onFaceSelect?: (face: LockedFaceSummary) => void;
}

export function FramePlayer({
  frames,
  events,
  faces,
  currentIndex,
  onSeek,
  onFaceSelect,
}: FramePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const lastIndex = frames.length - 1;
  const frame = frames[currentIndex];
  const endSeconds = frames[lastIndex]?.tSeconds ?? 0;
  const facesInFrame = faces.filter(
    (face) => face.frameIndex === frame?.frameIndex,
  );
  const eventsInFrame = events.filter(
    (event) => event.frameIndex === frame?.frameIndex,
  );

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      if (currentIndex >= lastIndex) {
        setIsPlaying(false);
      } else {
        onSeek(currentIndex + 1);
      }
    }, PLAYBACK_MS);
    return () => clearInterval(timer);
  }, [isPlaying, currentIndex, lastIndex, onSeek]);

  function togglePlay() {
    if (!isPlaying && currentIndex >= lastIndex) onSeek(0);
    setIsPlaying((playing) => !playing);
  }

  function step(delta: number) {
    setIsPlaying(false);
    onSeek(Math.min(lastIndex, Math.max(0, currentIndex + delta)));
  }

  if (!frame) return null;

  return (
    <section aria-label="Blurred frames" className="flex flex-col gap-4">
      <div className="relative aspect-video overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl shadow-black/40">
        <FrameImage
          src={frame.blurredUrl}
          alt={`Blurred frame ${currentIndex + 1} of ${frames.length}, at ${formatClipTime(frame.tSeconds)}`}
          priority
        />

        {facesInFrame.map((face) => {
          const style = {
            left: `${face.bbox.x * 100}%`,
            top: `${face.bbox.y * 100}%`,
            width: `${face.bbox.width * 100}%`,
            height: `${face.bbox.height * 100}%`,
          };
          const content = (
            <span className="absolute -top-2.5 -right-2.5 grid size-6 place-items-center rounded-full bg-zinc-950 text-indigo-300 ring-1 ring-indigo-400/60">
              <LockKeyhole className="size-3.5" aria-hidden />
            </span>
          );
          return onFaceSelect ? (
            <button
              key={face.id}
              type="button"
              style={style}
              onClick={() => onFaceSelect(face)}
              aria-label="Locked face. Unlock with a reason."
              className="absolute cursor-pointer rounded-lg border-2 border-indigo-400/70 bg-indigo-500/10 outline-none transition-all duration-200 hover:border-indigo-300 hover:bg-indigo-500/20 focus-visible:ring-2 focus-visible:ring-white"
            >
              {content}
            </button>
          ) : (
            <span
              key={face.id}
              style={style}
              aria-hidden
              className="absolute rounded-lg border-2 border-indigo-400/70 bg-indigo-500/10"
            >
              {content}
            </span>
          );
        })}

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
          <span className="rounded-lg bg-zinc-950/80 px-2 py-1 font-mono text-xs text-zinc-200 backdrop-blur-sm">
            {formatClipTime(frame.tSeconds)} · frame {currentIndex + 1}/
            {frames.length}
          </span>
          {eventsInFrame.length > 0 && (
            <span className="rounded-lg bg-amber-500/90 px-2 py-1 text-xs font-semibold text-zinc-950">
              {eventsInFrame
                .map((event) => EVENT_TYPE_LABELS[event.type])
                .join(", ")}{" "}
              detected here
            </span>
          )}
        </div>
        <span className="pointer-events-none absolute right-3 bottom-3 hidden items-center sm:inline-flex gap-1.5 rounded-lg bg-zinc-950/80 px-2 py-1 text-xs text-zinc-300 backdrop-blur-sm">
          <LockKeyhole className="size-3 text-emerald-400" aria-hidden />
          Blurred before upload
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="icon-lg"
          className="size-11 rounded-xl"
          onClick={togglePlay}
          aria-label={isPlaying ? "Pause" : "Play frames"}
        >
          {isPlaying ? <Pause aria-hidden /> : <Play aria-hidden />}
        </Button>
        <Button
          variant="ghost"
          size="icon-lg"
          className="size-11 rounded-xl"
          onClick={() => step(-1)}
          disabled={currentIndex === 0}
          aria-label="Previous frame"
        >
          <ChevronLeft aria-hidden />
        </Button>
        <Button
          variant="ghost"
          size="icon-lg"
          className="size-11 rounded-xl"
          onClick={() => step(1)}
          disabled={currentIndex === lastIndex}
          aria-label="Next frame"
        >
          <ChevronRight aria-hidden />
        </Button>
        <span className="ml-auto font-mono text-xs text-zinc-500 tabular-nums">
          {formatClipTime(frame.tSeconds)} / {formatClipTime(endSeconds)}
        </span>
      </div>

      <Timeline
        frames={frames}
        events={events}
        currentIndex={currentIndex}
        onSeek={(index) => {
          setIsPlaying(false);
          onSeek(index);
        }}
      />

      <ol
        aria-label="Frame thumbnails"
        className="flex gap-1.5 overflow-x-auto pb-1"
      >
        {frames.map((thumb, index) => (
          <li key={thumb.id} className="shrink-0">
            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                onSeek(index);
              }}
              aria-label={`Frame ${index + 1} at ${formatClipTime(thumb.tSeconds)}`}
              aria-current={index === currentIndex ? "true" : undefined}
              className={cn(
                "block aspect-video w-16 cursor-pointer overflow-hidden rounded-md outline-none ring-1 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-indigo-400",
                index === currentIndex
                  ? "ring-2 ring-indigo-500"
                  : "opacity-60 ring-zinc-800 hover:opacity-100 hover:ring-zinc-600",
              )}
            >
              <FrameImage src={thumb.blurredUrl} alt="" />
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}

interface TimelineProps {
  frames: ClipFrame[];
  events: ClipEvent[];
  currentIndex: number;
  onSeek: (index: number) => void;
}

function Timeline({ frames, events, currentIndex, onSeek }: TimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const lastIndex = Math.max(1, frames.length - 1);
  const position = (index: number) => `${(index / lastIndex) * 100}%`;
  const indexOfFrame = (frameIndex: number) =>
    Math.max(
      0,
      frames.findIndex((frame) => frame.frameIndex === frameIndex),
    );

  function seekToPointer(event: PointerEvent<HTMLDivElement>) {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const ratio = (event.clientX - rect.left) / rect.width;
    onSeek(Math.round(Math.min(1, Math.max(0, ratio)) * lastIndex));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const moves: Record<string, number> = {
      ArrowLeft: currentIndex - 1,
      ArrowDown: currentIndex - 1,
      ArrowRight: currentIndex + 1,
      ArrowUp: currentIndex + 1,
      Home: 0,
      End: frames.length - 1,
    };
    const next = moves[event.key];
    if (next === undefined) return;
    event.preventDefault();
    onSeek(Math.min(frames.length - 1, Math.max(0, next)));
  }

  const current = frames[currentIndex];

  return (
    <div className="flex flex-col gap-2">
      <div className="relative h-7">
        {events.map((event) => {
          const status = eventStatus(event);
          const index = indexOfFrame(event.frameIndex);
          return (
            <button
              key={event.id}
              type="button"
              onClick={() => onSeek(index)}
              style={{ left: position(index) }}
              aria-label={`Jump to ${EVENT_TYPE_LABELS[event.type].toLowerCase()} at ${formatClipTime(frames[index]?.tSeconds ?? 0)}`}
              className="group absolute top-0 flex -translate-x-1/2 cursor-pointer flex-col items-center outline-none"
            >
              <span
                className={cn(
                  "size-3.5 rotate-45 rounded-[3px] ring-4 transition-all duration-200 group-hover:scale-125 group-focus-visible:ring-indigo-400",
                  EVENT_MARKER_CLASSES[status],
                )}
              />
              <span
                className={cn(
                  "mt-0.5 h-3 w-px",
                  status === "below" ? "bg-zinc-600" : "bg-amber-400/60",
                )}
              />
            </button>
          );
        })}
      </div>
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label="Clip timeline"
        aria-valuemin={0}
        aria-valuemax={frames.length - 1}
        aria-valuenow={currentIndex}
        aria-valuetext={`${formatClipTime(current?.tSeconds ?? 0)}, frame ${currentIndex + 1} of ${frames.length}`}
        onKeyDown={handleKeyDown}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          seekToPointer(event);
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            seekToPointer(event);
          }
        }}
        className="relative h-3 cursor-pointer touch-none rounded-full bg-zinc-800 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-indigo-500/40"
          style={{ width: position(currentIndex) }}
        />
        {events.map((event) => (
          <span
            key={event.id}
            aria-hidden
            style={{ left: position(indexOfFrame(event.frameIndex)) }}
            className="absolute inset-y-0 w-1 -translate-x-1/2 rounded-full bg-amber-400/70"
          />
        ))}
        <span
          aria-hidden
          style={{ left: position(currentIndex) }}
          className="absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-indigo-500 shadow-lg shadow-indigo-500/40"
        />
      </div>
    </div>
  );
}
