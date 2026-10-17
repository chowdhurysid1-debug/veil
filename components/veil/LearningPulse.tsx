"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "cn";

import { pluralize } from "./format";
import { MOTION } from "./motion";

interface LearningPulseProps {
  newLabels: number;
  sites: number;
  className?: string;
}

/** "Learned from 1 new label across 2 sites", fading in each time it grows. */
export function LearningPulse({
  newLabels,
  sites,
  className,
}: LearningPulseProps) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <AnimatePresence initial={false}>
      {newLabels > 0 && (
        <motion.div
          key={newLabels}
          role="status"
          initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={MOTION.fade}
          className={cn(
            "flex items-center gap-3 border border-signal/50 bg-signal-wash px-4 py-3",
            className,
          )}
        >
          <span
            aria-hidden
            className="size-1.5 shrink-0 animate-veil-blink rounded-full bg-signal"
          />
          <p className="label-mono text-signal">
            Learned from {pluralize(newLabels, "new label")} across{" "}
            {pluralize(sites, "site")}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
