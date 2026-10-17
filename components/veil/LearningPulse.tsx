"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { cn } from "cn";

import { pluralize } from "./format";

interface LearningPulseProps {
  newLabels: number;
  sites: number;
  className?: string;
}

/** "Learned from 1 new label across 2 sites", with a pulse each time it grows. */
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
          initial={
            shouldReduceMotion ? false : { opacity: 0, y: -6, scale: 0.98 }
          }
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className={cn(
            "relative flex items-center gap-3 overflow-hidden rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3",
            className,
          )}
        >
          <span className="relative grid size-8 shrink-0 place-items-center">
            {!shouldReduceMotion && (
              <motion.span
                aria-hidden
                className="absolute inset-0 rounded-full bg-emerald-400/40"
                initial={{ scale: 0.6, opacity: 0.8 }}
                animate={{ scale: 1.8, opacity: 0 }}
                transition={{ duration: 1.2, repeat: 2, ease: "easeOut" }}
              />
            )}
            <span className="relative grid size-8 place-items-center rounded-full bg-emerald-500/20 text-emerald-300">
              <Sparkles className="size-4" aria-hidden />
            </span>
          </span>
          <p className="text-sm font-medium text-emerald-100">
            Learned from {pluralize(newLabels, "new label")} across{" "}
            {pluralize(sites, "site")}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
