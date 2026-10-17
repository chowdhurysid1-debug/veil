"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Maximize,
  NotebookPen,
  Pause,
  Play,
  RotateCcw,
  X,
} from "lucide-react";
import { cn } from "cn";

import { VeilLogo } from "@/components/veil/VeilLogo";

import { ChannelCut, MonitorTexture } from "./motion";
import { DECKS, type DeckCut, type PitchSlide } from "./slides";

const SWIPE_THRESHOLD_PX = 50;
const TICK_MS = 250;

export function PitchDeck({ cut = "full" }: { cut?: DeckCut }) {
  const { slides, totalSeconds } = DECKS[cut];
  // `cuts` counts slide changes, so each one replays the channel-cut transition.
  const [nav, setNav] = useState<{
    index: number;
    direction: 1 | -1;
    cuts: number;
  }>({ index: 0, direction: 1, cuts: 0 });
  const { index } = nav;
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isOverviewOpen, setIsOverviewOpen] = useState(false);
  const timer = usePitchTimer(index);
  const touchStartX = useRef<number | null>(null);
  const hasReadHash = useRef(false);
  const shouldReduceMotion = useReducedMotion();

  const slide = slides[index];
  const lastIndex = slides.length - 1;

  const goTo = useCallback(
    (next: number) => {
      setNav((current) => {
        const clamped = Math.max(0, Math.min(lastIndex, next));
        if (clamped === current.index) return current;
        return {
          index: clamped,
          direction: clamped > current.index ? 1 : -1,
          cuts: current.cuts + 1,
        };
      });
    },
    [lastIndex],
  );

  // Deep links: /pitch#moat opens on the moat slide, and editing the hash jumps.
  useEffect(() => {
    const readHash = () => {
      hasReadHash.current = true;
      const fromHash = slides.findIndex(
        (candidate) => `#${candidate.id}` === window.location.hash,
      );
      if (fromHash >= 0) goTo(fromHash);
    };
    const frame = requestAnimationFrame(readHash);
    window.addEventListener("hashchange", readHash);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", readHash);
    };
  }, [goTo, slides]);

  useEffect(() => {
    // Writing before the first read would overwrite a deep link.
    if (!hasReadHash.current) return;
    window.history.replaceState(null, "", `#${slide.id}`);
  }, [slide.id]);

  const { toggle: toggleTimer, reset: resetTimer } = timer;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key.toLowerCase();
      const actions: Record<string, () => void> = {
        arrowright: () => goTo(index + 1),
        arrowdown: () => goTo(index + 1),
        pagedown: () => goTo(index + 1),
        " ": () => goTo(index + 1),
        arrowleft: () => goTo(index - 1),
        arrowup: () => goTo(index - 1),
        pageup: () => goTo(index - 1),
        home: () => goTo(0),
        end: () => goTo(lastIndex),
        n: () => setIsNotesOpen((isOpen) => !isOpen),
        o: () => setIsOverviewOpen((isOpen) => !isOpen),
        t: toggleTimer,
        r: resetTimer,
        f: toggleFullscreen,
        escape: () => {
          setIsOverviewOpen(false);
          setIsNotesOpen(false);
        },
      };
      const action = actions[key];
      if (!action) return;
      event.preventDefault();
      action();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goTo, index, lastIndex, toggleTimer, resetTimer]);

  const handleTouchStart = (event: React.TouchEvent) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };
  const handleTouchEnd = (event: React.TouchEvent) => {
    const startX = touchStartX.current;
    const endX = event.changedTouches[0]?.clientX;
    touchStartX.current = null;
    if (startX === null || endX === undefined) return;
    const deltaX = endX - startX;
    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) return;
    goTo(deltaX < 0 ? index + 1 : index - 1);
  };

  const slideNumber = String(index + 1).padStart(2, "0");
  const isOverBudget = timer.isRunning && timer.slideSeconds > slide.seconds;

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden bg-void text-ink"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <MonitorTexture />
      <ViewfinderCorners />

      <header className="relative z-20 flex items-center justify-between gap-4 px-gutter pt-5 pb-3">
        <VeilLogo href="/" />
        <p className="label-mono hidden text-ink md:block" aria-live="polite">
          {slideNumber} / {slide.job}
        </p>
        <div className="flex items-center gap-1">
          <TimerReadout
            elapsed={timer.elapsedSeconds}
            isRunning={timer.isRunning}
            isOverBudget={isOverBudget}
            onToggle={toggleTimer}
            onReset={resetTimer}
            totalSeconds={totalSeconds}
          />
          <ChromeButton
            label="Speaker notes (N)"
            isActive={isNotesOpen}
            onClick={() => setIsNotesOpen((isOpen) => !isOpen)}
          >
            <NotebookPen className="size-4" aria-hidden />
          </ChromeButton>
          <ChromeButton
            label="Pitch anatomy (O)"
            isActive={isOverviewOpen}
            onClick={() => setIsOverviewOpen(true)}
          >
            <LayoutGrid className="size-4" aria-hidden />
          </ChromeButton>
          <ChromeButton
            label="Full screen (F)"
            onClick={toggleFullscreen}
            className="hidden sm:inline-flex"
          >
            <Maximize className="size-4" aria-hidden />
          </ChromeButton>
        </div>
      </header>

      <div className="relative z-10 flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1">
          <main
            aria-roledescription="slide deck"
            aria-label="Veil pitch"
            className="absolute inset-0 overflow-y-auto px-gutter"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.section
                key={slide.id}
                aria-roledescription="slide"
                aria-label={`${slideNumber} of ${slides.length}: ${slide.job}`}
                className="h-full"
                exit={
                  shouldReduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, filter: "blur(10px)", scale: 0.985 }
                }
                transition={{ duration: 0.3 }}
              >
                <slide.Content />
              </motion.section>
            </AnimatePresence>
          </main>
          {!shouldReduceMotion && nav.cuts > 0 && (
            <ChannelCut
              key={nav.cuts}
              direction={nav.direction}
              label={`Ch ${slideNumber} / ${slide.job}`}
            />
          )}
        </div>

        <AnimatePresence>
          {isNotesOpen && (
            <NotesPanel
              slide={slide}
              slideSeconds={timer.slideSeconds}
              onClose={() => setIsNotesOpen(false)}
            />
          )}
        </AnimatePresence>
      </div>

      <footer className="relative z-20 flex flex-col gap-3 px-gutter pt-3 pb-5">
        <div className="flex gap-1" role="group" aria-label="Slides">
          {slides.map((candidate, candidateIndex) => (
            <button
              key={candidate.id}
              type="button"
              onClick={() => goTo(candidateIndex)}
              aria-label={`Go to slide ${candidateIndex + 1}: ${candidate.job}`}
              aria-current={candidateIndex === index ? "step" : undefined}
              className="group flex h-6 flex-1 cursor-pointer items-center"
            >
              <span
                className={cn(
                  "h-px w-full transition-colors duration-500 ease-veil",
                  candidateIndex === index
                    ? "h-0.5 bg-ink"
                    : candidateIndex < index
                      ? "bg-ink-muted group-hover:bg-ink"
                      : "bg-hairline-strong group-hover:bg-ink-muted",
                )}
              />
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between gap-4">
          <p className="label-mono tabular-nums md:hidden">
            {slideNumber} / {slide.job}
          </p>
          <p className="label-mono hidden md:block">
            Arrows to move / N notes / O anatomy / T timer / F full screen
          </p>
          <div className="flex items-center gap-1">
            <ChromeButton
              label="Previous slide"
              onClick={() => goTo(index - 1)}
              disabled={index === 0}
            >
              <ChevronLeft className="size-4" aria-hidden />
            </ChromeButton>
            <span className="label-mono px-1 text-center whitespace-nowrap tabular-nums">
              {slideNumber} / {slides.length}
            </span>
            <ChromeButton
              label="Next slide"
              onClick={() => goTo(index + 1)}
              disabled={index === slides.length - 1}
            >
              <ChevronRight className="size-4" aria-hidden />
            </ChromeButton>
          </div>
        </div>
      </footer>

      <AnimatePresence>
        {isOverviewOpen && (
          <AnatomyOverlay
            slides={slides}
            totalSeconds={totalSeconds}
            activeIndex={index}
            onPick={(picked) => {
              goTo(picked);
              setIsOverviewOpen(false);
            }}
            onClose={() => setIsOverviewOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/** Elapsed pitch time, plus how long the current slide has been up. */
function usePitchTimer(slideIndex: number) {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [slideStartedAt, setSlideStartedAt] = useState(0);
  const [trackedIndex, setTrackedIndex] = useState(slideIndex);

  // Restart the per-slide clock whenever the slide changes.
  if (trackedIndex !== slideIndex) {
    setTrackedIndex(slideIndex);
    setSlideStartedAt(elapsedSeconds);
  }

  useEffect(() => {
    if (!isRunning) return;
    const startedAt = Date.now() - elapsedSeconds * 1000;
    const interval = setInterval(() => {
      setElapsedSeconds((Date.now() - startedAt) / 1000);
    }, TICK_MS);
    return () => clearInterval(interval);
    // elapsedSeconds is read once when the timer starts, on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning]);

  const toggle = useCallback(() => setIsRunning((running) => !running), []);
  const reset = useCallback(() => {
    setIsRunning(false);
    setElapsedSeconds(0);
    setSlideStartedAt(0);
  }, []);

  return {
    isRunning,
    elapsedSeconds,
    slideSeconds: elapsedSeconds - slideStartedAt,
    toggle,
    reset,
  };
}

function formatClock(totalSeconds: number) {
  const whole = Math.floor(totalSeconds);
  const minutes = String(Math.floor(whole / 60)).padStart(2, "0");
  const seconds = String(whole % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function toggleFullscreen() {
  if (document.fullscreenElement) {
    void document.exitFullscreen();
  } else {
    document.documentElement.requestFullscreen().catch(() => {
      // Some browsers block full screen inside frames. The deck still works.
    });
  }
}

function TimerReadout({
  elapsed,
  isRunning,
  isOverBudget,
  onToggle,
  onReset,
  totalSeconds,
}: {
  elapsed: number;
  isRunning: boolean;
  isOverBudget: boolean;
  onToggle: () => void;
  onReset: () => void;
  totalSeconds: number;
}) {
  return (
    <div className="mr-1 flex items-center gap-1">
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          isRunning ? "animate-veil-blink bg-signal" : "bg-ink-dim",
        )}
      />
      <span
        className={cn(
          "px-1 text-center font-mono text-xs tracking-[0.1em] whitespace-nowrap tabular-nums",
          isOverBudget ? "text-signal" : "text-ink-muted",
        )}
      >
        {formatClock(elapsed)}
        <span className="hidden sm:inline"> / {formatClock(totalSeconds)}</span>
      </span>
      <ChromeButton
        label={isRunning ? "Pause timer (T)" : "Start timer (T)"}
        onClick={onToggle}
      >
        {isRunning ? (
          <Pause className="size-4" aria-hidden />
        ) : (
          <Play className="size-4" aria-hidden />
        )}
      </ChromeButton>
      <ChromeButton
        label="Reset timer (R)"
        onClick={onReset}
        className="hidden sm:inline-flex"
      >
        <RotateCcw className="size-4" aria-hidden />
      </ChromeButton>
    </div>
  );
}

function ChromeButton({
  label,
  onClick,
  children,
  isActive = false,
  disabled = false,
  className,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  isActive?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={isActive || undefined}
      title={label}
      className={cn(
        "inline-flex size-11 cursor-pointer items-center justify-center text-ink-muted transition-all duration-300 ease-veil outline-none hover:bg-white/5 hover:text-ink focus-visible:ring-1 focus-visible:ring-signal active:bg-white/10 disabled:pointer-events-none disabled:opacity-30",
        isActive && "bg-white/5 text-ink",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Camera viewfinder crop marks framing the deck. */
function ViewfinderCorners() {
  const corner = "absolute size-5 border-hairline-strong";
  return (
    <div aria-hidden className="pointer-events-none absolute inset-3 z-0">
      <span className={cn(corner, "top-0 left-0 border-t border-l")} />
      <span className={cn(corner, "top-0 right-0 border-t border-r")} />
      <span className={cn(corner, "bottom-0 left-0 border-b border-l")} />
      <span className={cn(corner, "right-0 bottom-0 border-r border-b")} />
    </div>
  );
}

function NotesPanel({
  slide,
  slideSeconds,
  onClose,
}: {
  slide: PitchSlide;
  slideSeconds: number;
  onClose: () => void;
}) {
  return (
    <motion.aside
      aria-label="Speaker notes"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ duration: 0.3 }}
      className="absolute inset-x-0 bottom-0 z-30 flex max-h-[70%] flex-col overflow-y-auto border-t border-hairline-strong bg-panel md:static md:max-h-none md:w-[24rem] md:shrink-0 md:border-t-0 md:border-l"
    >
      <div className="flex items-center justify-between border-b border-hairline px-5 py-3">
        <span className="label-mono text-ink">Speaker notes</span>
        <ChromeButton label="Close notes" onClick={onClose}>
          <X className="size-4" aria-hidden />
        </ChromeButton>
      </div>
      <div className="flex flex-col gap-6 px-5 py-5">
        <div className="flex items-baseline justify-between gap-4">
          <span className="font-display text-title font-bold uppercase">
            {slide.job}
          </span>
          <span
            className={cn(
              "font-mono text-xs tabular-nums",
              slideSeconds > slide.seconds ? "text-signal" : "text-ink-muted",
            )}
          >
            {formatClock(slideSeconds)} / {formatClock(slide.seconds)}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <span className="label-mono">Its job</span>
          <p className="text-sm leading-relaxed text-ink-muted">{slide.why}</p>
        </div>
        <div className="flex flex-col gap-2">
          <span className="label-mono">Say</span>
          <ul className="flex flex-col gap-3">
            {slide.say.map((line) => (
              <li
                key={line}
                className="border-l border-hairline-strong pl-3 text-sm leading-relaxed text-ink"
              >
                {line}
              </li>
            ))}
          </ul>
        </div>
        {slide.question && (
          <div className="flex flex-col gap-2 border-t border-hairline pt-5">
            <span className="label-mono">Likely judge question</span>
            <p className="text-sm font-semibold text-ink">
              {slide.question.ask}
            </p>
            <p className="text-sm leading-relaxed text-ink-muted">
              {slide.question.answer}
            </p>
          </div>
        )}
      </div>
    </motion.aside>
  );
}

function AnatomyOverlay({
  slides,
  totalSeconds,
  activeIndex,
  onPick,
  onClose,
}: {
  slides: PitchSlide[];
  totalSeconds: number;
  activeIndex: number;
  onPick: (index: number) => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="anatomy-heading"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-50 overflow-y-auto bg-void/95 backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-gutter py-8">
        <div className="flex items-start justify-between gap-6">
          <div className="flex flex-col gap-3">
            <p className="label-mono">
              Pitch anatomy / {slides.length} parts /{" "}
              {formatClock(totalSeconds)} planned
            </p>
            <h2
              id="anatomy-heading"
              className="max-w-[22ch] font-display text-headline font-bold"
            >
              Every part a winning pitch needs.
            </h2>
          </div>
          <ChromeButton label="Close (Esc)" onClick={onClose}>
            <X className="size-5" aria-hidden />
          </ChromeButton>
        </div>
        <ol className="grid grid-cols-1 border-t border-l border-hairline sm:grid-cols-2 lg:grid-cols-4">
          {slides.map((slide, slideIndex) => (
            <li key={slide.id} className="border-r border-b border-hairline">
              <button
                type="button"
                autoFocus={slideIndex === activeIndex}
                onClick={() => onPick(slideIndex)}
                className={cn(
                  "flex h-full w-full cursor-pointer flex-col gap-3 p-5 text-left transition-colors duration-500 ease-veil outline-none hover:bg-panel focus-visible:bg-panel focus-visible:ring-1 focus-visible:ring-signal focus-visible:ring-inset",
                  slideIndex === activeIndex && "bg-panel",
                )}
              >
                <span className="flex items-center justify-between">
                  <span className="label-mono tabular-nums">
                    {String(slideIndex + 1).padStart(2, "0")}
                  </span>
                  <span className="label-mono tabular-nums">
                    {formatClock(slide.seconds)}
                  </span>
                </span>
                <span className="font-display text-title font-bold uppercase">
                  {slide.job}
                </span>
                <span className="text-sm leading-relaxed text-ink-muted">
                  {slide.why}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </motion.div>
  );
}
