"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
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
const DEFAULT_ASPECT_RATIO = 16 / 9;

export type LockedFaceSummary = ClipDetail["faces"][number];

/** The last sampled frame at or before `seconds`: the one the video is showing. */
export function frameIndexAt(frames: ClipFrame[], seconds: number): number {
  let index = 0;
  for (let i = 0; i < frames.length; i++) {
    if (frames[i].tSeconds <= seconds) index = i;
    else break;
  }
  return index;
}

interface FramePlayerProps {
  frames: ClipFrame[];
  events: ClipEvent[];
  faces: LockedFaceSummary[];
  currentIndex: number;
  onSeek: (index: number) => void;
  onFaceSelect?: (face: LockedFaceSummary) => void;
  /** Rendered directly under the frame, above the transport controls. */
  afterFrame?: ReactNode;
  /** The fully blurred video. Without it, the player steps through the stills. */
  videoUrl?: string | null;
}

export function FramePlayer({
  frames,
  events,
  faces,
  currentIndex,
  onSeek,
  onFaceSelect,
  afterFrame,
  videoUrl = null,
}: FramePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(DEFAULT_ASPECT_RATIO);
  const [videoSeconds, setVideoSeconds] = useState<number | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  // The index playback itself moved to, so seeking only follows outside changes.
  const playbackIndexRef = useRef<number | null>(null);
  const hasVideo = videoUrl !== null;
  const lastIndex = frames.length - 1;
  const frame = frames[currentIndex];
  const lastFrameSeconds = frames[lastIndex]?.tSeconds ?? 0;
  const endSeconds = videoDuration ?? lastFrameSeconds;
  const isVideoPlaying = hasVideo && isPlaying;
  const shownSeconds =
    isVideoPlaying && videoSeconds !== null
      ? videoSeconds
      : (frame?.tSeconds ?? 0);
  const facesInFrame = faces.filter(
    (face) => face.frameIndex === frame?.frameIndex,
  );
  const eventsInFrame = events.filter(
    (event) => event.frameIndex === frame?.frameIndex,
  );

  // Stills keep their own shape too, so face boxes line up on portrait footage.
  const firstFrameUrl = frames[0]?.blurredUrl;
  useEffect(() => {
    if (hasVideo || !firstFrameUrl) return;
    const image = new window.Image();
    image.onload = () => {
      if (image.naturalWidth > 0 && image.naturalHeight > 0) {
        setAspectRatio(image.naturalWidth / image.naturalHeight);
      }
    };
    image.src = firstFrameUrl;
  }, [hasVideo, firstFrameUrl]);

  // Video: follow the playhead and mark the sampled frame it is on.
  useEffect(() => {
    if (!isVideoPlaying) return;
    let animationFrame = 0;
    let lastReported = -1;
    const tick = () => {
      const video = videoRef.current;
      if (video) {
        setVideoSeconds(video.currentTime);
        const index = frameIndexAt(frames, video.currentTime);
        if (index !== lastReported) {
          lastReported = index;
          playbackIndexRef.current = index;
          onSeek(index);
        }
      }
      animationFrame = requestAnimationFrame(tick);
    };
    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, [isVideoPlaying, frames, onSeek]);

  // Video: jump to the frame picked outside playback (timeline, alert, face).
  const frameSeconds = frame?.tSeconds;
  useEffect(() => {
    const video = videoRef.current;
    if (!video || frameSeconds === undefined) return;
    if (playbackIndexRef.current === currentIndex) return;
    playbackIndexRef.current = null;
    if (Math.abs(video.currentTime - frameSeconds) > 0.05) {
      video.currentTime = frameSeconds;
    }
  }, [currentIndex, frameSeconds]);

  // Stills: step through the sampled frames.
  useEffect(() => {
    if (!isPlaying || hasVideo) return;
    const timer = setInterval(() => {
      if (currentIndex >= lastIndex) {
        setIsPlaying(false);
      } else {
        onSeek(currentIndex + 1);
      }
    }, PLAYBACK_MS);
    return () => clearInterval(timer);
  }, [isPlaying, hasVideo, currentIndex, lastIndex, onSeek]);

  function togglePlay() {
    const video = videoRef.current;
    if (hasVideo && video) {
      if (!video.paused) {
        video.pause();
        return;
      }
      if (video.ended) video.currentTime = 0;
      void video.play().catch(() => setIsPlaying(false));
      return;
    }
    if (!isPlaying && currentIndex >= lastIndex) onSeek(0);
    setIsPlaying((playing) => !playing);
  }

  function stopPlayback() {
    videoRef.current?.pause();
    setIsPlaying(false);
  }

  // Paused video rests on a sampled frame, where the locked face boxes belong.
  function handleVideoPause() {
    setIsPlaying(false);
    setVideoSeconds(null);
    const video = videoRef.current;
    const settled = frames[playbackIndexRef.current ?? currentIndex];
    if (video && settled) video.currentTime = settled.tSeconds;
  }

  function step(delta: number) {
    stopPlayback();
    onSeek(Math.min(lastIndex, Math.max(0, currentIndex + delta)));
  }

  if (!frame) return null;

  return (
    <section aria-label="Blurred frames" className="flex flex-col gap-4">
      <div className="relative aspect-video overflow-hidden border border-hairline bg-panel">
        <div
          className="relative mx-auto h-full max-w-full"
          style={{ aspectRatio }}
        >
          {hasVideo ? (
            <video
              ref={videoRef}
              src={videoUrl ?? undefined}
              muted
              playsInline
              preload="auto"
              aria-label="Blurred video of the clip. Every head is blurred in every frame."
              onLoadedMetadata={(event) => {
                const video = event.currentTarget;
                if (video.videoWidth > 0 && video.videoHeight > 0) {
                  setAspectRatio(video.videoWidth / video.videoHeight);
                }
                if (Number.isFinite(video.duration)) {
                  setVideoDuration(video.duration);
                }
                video.currentTime = frame.tSeconds;
              }}
              onPlay={() => setIsPlaying(true)}
              onPause={handleVideoPause}
              className="absolute inset-0 size-full object-cover"
            />
          ) : (
            <FrameImage
              src={frame.blurredUrl}
              alt={`Blurred frame ${currentIndex + 1} of ${frames.length}, at ${formatClipTime(frame.tSeconds)}`}
              priority
            />
          )}

          {!isVideoPlaying && facesInFrame.map((face) => {
          const style = {
            left: `${face.bbox.x * 100}%`,
            top: `${face.bbox.y * 100}%`,
            width: `${face.bbox.width * 100}%`,
            height: `${face.bbox.height * 100}%`,
          };
          const content = (
            <>
              <FaceBrackets />
              <span className="absolute -top-5 left-0 flex items-center gap-1 bg-void/80 px-1 font-mono text-[10px] tracking-[0.14em] text-ink uppercase">
                <LockKeyhole className="size-2.5" aria-hidden />
                Locked
              </span>
            </>
          );
          return onFaceSelect ? (
            <button
              key={face.id}
              type="button"
              style={style}
              onClick={() => onFaceSelect(face)}
              aria-label="Locked face. Unlock with a reason."
              className="group/face absolute cursor-pointer bg-white/[0.03] outline-none transition-all duration-500 ease-veil hover:bg-white/10 focus-visible:ring-1 focus-visible:ring-signal"
            >
              {content}
            </button>
          ) : (
            <span
              key={face.id}
              style={style}
              aria-hidden
              className="absolute bg-white/[0.03]"
            >
              {content}
            </span>
          );
        })}
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 bg-gradient-to-b from-void/80 to-transparent p-3 sm:p-4">
          <span className="font-mono text-[10px] tracking-[0.14em] text-ink uppercase tabular-nums sm:text-xs">
            T+{formatClipTime(shownSeconds)}
            <span className="text-ink-dim">
              {isVideoPlaying ? (
                " / Live blurred video"
              ) : (
                <>
                  {" "}
                  / Frame {String(currentIndex + 1).padStart(2, "0")} of{" "}
                  {String(frames.length).padStart(2, "0")}
                </>
              )}
            </span>
          </span>
          {eventsInFrame.length > 0 && (
            <span className="flex items-center gap-2 border border-signal/60 bg-void/70 px-2 py-1 font-mono text-[10px] tracking-[0.14em] text-signal uppercase sm:text-xs">
              <span
                aria-hidden
                className="size-1.5 animate-veil-blink rounded-full bg-signal"
              />
              {eventsInFrame
                .map((event) => EVENT_TYPE_LABELS[event.type])
                .join(", ")}{" "}
              detected
            </span>
          )}
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-void/80 to-transparent p-3 sm:p-4">
          <span className="font-mono text-[10px] tracking-[0.14em] text-ink uppercase sm:text-xs">
            {isVideoPlaying
              ? "Every head blurred"
              : `Faces in frame ${String(facesInFrame.length).padStart(2, "0")}`}
          </span>
          <span className="hidden items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] text-ink-muted uppercase sm:inline-flex sm:text-xs">
            <LockKeyhole className="size-3" aria-hidden />
            Blurred before upload
          </span>
        </div>
      </div>

      {afterFrame}

      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="icon-lg"
          className="size-11"
          onClick={togglePlay}
          aria-label={
            isPlaying ? "Pause" : hasVideo ? "Play video" : "Play frames"
          }
        >
          {isPlaying ? <Pause aria-hidden /> : <Play aria-hidden />}
        </Button>
        <Button
          variant="ghost"
          size="icon-lg"
          className="size-11"
          onClick={() => step(-1)}
          disabled={currentIndex === 0}
          aria-label="Previous frame"
        >
          <ChevronLeft aria-hidden />
        </Button>
        <Button
          variant="ghost"
          size="icon-lg"
          className="size-11"
          onClick={() => step(1)}
          disabled={currentIndex === lastIndex}
          aria-label="Next frame"
        >
          <ChevronRight aria-hidden />
        </Button>
        <span className="ml-auto font-mono text-xs tracking-[0.14em] text-ink-dim tabular-nums">
          {formatClipTime(shownSeconds)} / {formatClipTime(endSeconds)}
        </span>
      </div>

      <Timeline
        frames={frames}
        events={events}
        currentIndex={currentIndex}
        playheadRatio={
          isVideoPlaying && videoSeconds !== null && lastFrameSeconds > 0
            ? Math.min(1, videoSeconds / lastFrameSeconds)
            : null
        }
        onSeek={(index) => {
          stopPlayback();
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
                stopPlayback();
                onSeek(index);
              }}
              aria-label={`Frame ${index + 1} at ${formatClipTime(thumb.tSeconds)}`}
              aria-current={index === currentIndex ? "true" : undefined}
              className={cn(
                "block aspect-video w-16 cursor-pointer overflow-hidden outline-none ring-1 transition-all duration-500 ease-veil focus-visible:ring-2 focus-visible:ring-signal",
                index === currentIndex
                  ? "ring-1 ring-ink"
                  : "opacity-40 ring-hairline hover:opacity-100 hover:ring-hairline-strong",
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
  /** While the video plays, the playhead moves smoothly instead of frame by frame. */
  playheadRatio: number | null;
  onSeek: (index: number) => void;
}

function Timeline({
  frames,
  events,
  currentIndex,
  playheadRatio,
  onSeek,
}: TimelineProps) {
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
  const playhead =
    playheadRatio === null
      ? position(currentIndex)
      : `${playheadRatio * 100}%`;

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
                  "size-2.5 rotate-45 ring-0 transition-all duration-500 ease-veil group-hover:scale-125 group-focus-visible:ring-1 group-focus-visible:ring-signal",
                  EVENT_MARKER_CLASSES[status],
                )}
              />
              <span
                className={cn(
                  "mt-0.5 h-3 w-px",
                  status === "below" ? "bg-hairline-strong" : "bg-signal/60",
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
        className="relative h-3 cursor-pointer touch-none outline-none focus-visible:ring-1 focus-visible:ring-signal"
      >
        <div aria-hidden className="absolute inset-x-0 top-1/2 h-px bg-hairline-strong" />
        <div
          className="absolute top-1/2 left-0 h-px bg-ink"
          style={{ width: playhead }}
        />
        {events.map((event) => (
          <span
            key={event.id}
            aria-hidden
            style={{ left: position(indexOfFrame(event.frameIndex)) }}
            className="absolute inset-y-0 w-px -translate-x-1/2 bg-signal"
          />
        ))}
        <span
          aria-hidden
          style={{ left: playhead }}
          className="absolute top-1/2 h-4 w-px -translate-x-1/2 -translate-y-1/2 bg-ink after:absolute after:top-1/2 after:left-1/2 after:size-2 after:-translate-x-1/2 after:-translate-y-1/2 after:rotate-45 after:border after:border-ink after:bg-void"
        />
      </div>
    </div>
  );
}

/** Targeting brackets on the four corners of a locked face. */
function FaceBrackets() {
  const corner = "absolute size-2.5 border-ink transition-all duration-500 ease-veil group-hover/face:size-3.5";
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0">
      <span className={cn(corner, "top-0 left-0 border-t border-l")} />
      <span className={cn(corner, "top-0 right-0 border-t border-r")} />
      <span className={cn(corner, "bottom-0 left-0 border-b border-l")} />
      <span className={cn(corner, "right-0 bottom-0 border-r border-b")} />
    </span>
  );
}
