"use client";

import { useEffect, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
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
        <span
          key={`${word}-${index}`}
          className="-mb-[0.12em] inline-block overflow-hidden pb-[0.12em] align-top"
        >
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
          {index < words.length - 1 && " "}
        </span>
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

const CUT_SECONDS = 0.9;

/**
 * The slide change: a camera-channel cut. A cover wipes across with the next
 * channel's name, a scan line riding its edge, then wipes off the new slide.
 */
export function ChannelCut({
  direction,
  label,
}: {
  direction: 1 | -1;
  label: string;
}) {
  const isForward = direction === 1;
  const clipFrames = isForward
    ? ["inset(0 100% 0 0)", "inset(0 0% 0 0%)", "inset(0 0% 0 100%)"]
    : ["inset(0 0 0 100%)", "inset(0 0% 0 0%)", "inset(0 100% 0 0%)"];
  const edgeFrames = isForward
    ? ["0%", "100%", "0%", "100%"]
    : ["100%", "0%", "100%", "0%"];

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-40">
      <motion.div
        className="absolute inset-0 flex items-center justify-center bg-void"
        initial={{ clipPath: clipFrames[0] }}
        animate={{ clipPath: clipFrames }}
        transition={{
          duration: CUT_SECONDS,
          times: [0, 0.45, 1],
          ease: EASE_VEIL,
        }}
      >
        <div className="scanlines absolute inset-0 opacity-60" />
        <span className="label-mono flex items-center gap-3 text-sm text-ink">
          <span className="size-2 animate-veil-blink rounded-full bg-signal" />
          {label}
        </span>
      </motion.div>
      <motion.div
        className="absolute inset-y-0 w-px bg-signal shadow-[0_0_24px_4px_rgb(255_176_0/0.45)]"
        initial={{ left: edgeFrames[0], opacity: 1 }}
        animate={{ left: edgeFrames, opacity: [1, 1, 1, 0] }}
        transition={{
          duration: CUT_SECONDS,
          times: [0, 0.45, 0.4501, 1],
          ease: EASE_VEIL,
        }}
      />
    </div>
  );
}

/** Film grain and scanlines over the whole deck: the feel of a monitor. */
export function MonitorTexture() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[1]">
      <div className="grain absolute inset-0 opacity-[0.07] mix-blend-overlay" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgb(0_0_0/0.55)_100%)]" />
    </div>
  );
}
