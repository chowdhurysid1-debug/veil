"use client";

import { Fragment, useEffect, useState, type ReactNode } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import { cn } from "cn";

import { EASE_VEIL, MOTION } from "@/components/veil/motion";

/** Comes into focus from a blur, the way Veil treats a face. */
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
        shouldReduceMotion ? false : { opacity: 0, y: 14, filter: "blur(14px)" }
      }
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ ...MOTION.fade, delay: 0.35 + order * 0.12 }}
    >
      {children}
    </motion.div>
  );
}

/** Each word rises out of its own mask, then the line settles. */
export function Headline({
  text,
  as: Tag = "h2",
  size = "headline",
  className,
  delay = 0.3,
}: {
  text: string;
  as?: "h1" | "h2" | "p";
  size?: "display" | "headline";
  className?: string;
  delay?: number;
}) {
  const shouldReduceMotion = useReducedMotion();
  const words = text.split(" ");
  return (
    <Tag
      className={cn(
        "font-display font-bold text-balance uppercase",
        size === "display" ? "text-display" : "text-headline",
        className,
      )}
    >
      {words.map((word, index) => (
        // The space sits outside the masked span: inside an inline-block it collapses.
        <Fragment key={`${word}-${index}`}>
          <span className="-mb-[0.12em] inline-block overflow-hidden pb-[0.12em] align-top">
            <motion.span
              className="inline-block"
              initial={shouldReduceMotion ? false : { y: "105%", rotate: 4 }}
              animate={{ y: "0%", rotate: 0 }}
              transition={{
                duration: 0.9,
                ease: EASE_VEIL,
                delay: delay + index * 0.055,
              }}
            >
              {word}
            </motion.span>
          </span>
          {index < words.length - 1 && " "}
        </Fragment>
      ))}
    </Tag>
  );
}

const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/#";
const SCRAMBLE_MS = 700;

/** Mono label that decodes from noise, like a feed locking on. */
export function Scramble({
  text,
  className,
  delay = 200,
}: {
  text: string;
  className?: string;
  delay?: number;
}) {
  const shouldReduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(text);

  useEffect(() => {
    if (shouldReduceMotion) return;
    let frame = 0;
    let start: number | null = null;
    const step = (now: number) => {
      start ??= now;
      const elapsed = now - start - delay;
      const settled =
        elapsed <= 0 ? 0 : Math.floor((elapsed / SCRAMBLE_MS) * text.length);
      setDisplay(
        text
          .split("")
          .map((char, index) =>
            char === " " || index < settled
              ? char
              : SCRAMBLE_CHARS[
                  Math.floor(Math.random() * SCRAMBLE_CHARS.length)
                ],
          )
          .join(""),
      );
      if (settled < text.length) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [text, delay, shouldReduceMotion]);

  return (
    <span className={className}>
      <span aria-hidden>{display}</span>
      <span className="sr-only">{text}</span>
    </span>
  );
}

// Wipe on, hold on the channel name, wipe off. Seconds.
const CUT_IN = 0.38;
const CUT_HOLD = 0.24;
const CUT_OUT = 0.5;

/**
 * The slide change: a camera-channel cut. A cover wipes across with a scan
 * line on its edge, holds on the next channel's name, then wipes off to
 * reveal the new slide. Cover and line read the same two values, so the line
 * always rides the cover's moving edge.
 */
export function ChannelCut({
  direction,
  label,
}: {
  direction: 1 | -1;
  label: string;
}) {
  const isForward = direction === 1;
  // Percent of the width the leading edge has covered, then uncovered.
  const covered = useMotionValue(0);
  const uncovered = useMotionValue(0);

  useEffect(() => {
    let isCancelled = false;
    const wipeOn = animate(covered, 100, { duration: CUT_IN, ease: EASE_VEIL });
    let wipeOff: ReturnType<typeof animate> | undefined;
    const hold = setTimeout(
      () => {
        if (isCancelled) return;
        wipeOff = animate(uncovered, 100, {
          duration: CUT_OUT,
          ease: EASE_VEIL,
        });
      },
      (CUT_IN + CUT_HOLD) * 1000,
    );
    return () => {
      isCancelled = true;
      clearTimeout(hold);
      wipeOn.stop();
      wipeOff?.stop();
    };
  }, [covered, uncovered]);

  const clipPath = useTransform(() => {
    const trailing = 100 - covered.get();
    const leading = uncovered.get();
    return isForward
      ? `inset(0 ${trailing}% 0 ${leading}%)`
      : `inset(0 ${leading}% 0 ${trailing}%)`;
  });
  const edgeLeft = useTransform(() => {
    const position = uncovered.get() > 0 ? uncovered.get() : covered.get();
    return `${isForward ? position : 100 - position}%`;
  });
  const edgeOpacity = useTransform(() => {
    const isHolding = covered.get() >= 100 && uncovered.get() <= 0;
    return isHolding || uncovered.get() >= 100 ? 0 : 1;
  });

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-40">
      <motion.div
        className="absolute inset-0 flex items-center justify-center bg-void"
        style={{ clipPath }}
      >
        <div className="scanlines absolute inset-0 opacity-60" />
        <motion.span
          className="label-mono flex items-center gap-3 text-sm text-ink"
          initial={{ opacity: 0, letterSpacing: "0.4em" }}
          animate={{ opacity: 1, letterSpacing: "0.14em" }}
          transition={{ duration: 0.4, delay: CUT_IN * 0.5 }}
        >
          <span className="size-2 animate-veil-blink rounded-full bg-signal" />
          {label}
        </motion.span>
      </motion.div>
      <motion.div
        className="absolute inset-y-0 w-px bg-signal shadow-[0_0_24px_4px_rgb(255_176_0/0.45)]"
        style={{ left: edgeLeft, opacity: edgeOpacity }}
      />
    </div>
  );
}

/** Film grain and scanlines over the whole deck: the feel of a monitor. */
export function MonitorTexture() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[1]">
      <div className="grain absolute -inset-[10%] opacity-[0.07] mix-blend-overlay" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgb(0_0_0/0.55)_100%)]" />
    </div>
  );
}
