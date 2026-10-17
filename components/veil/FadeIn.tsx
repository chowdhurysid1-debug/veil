"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface FadeInProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  /** Animate on mount instead of when scrolled into view (for the hero). */
  immediate?: boolean;
}

export function FadeIn({
  children,
  className,
  delay = 0,
  immediate = false,
}: FadeInProps) {
  const shouldReduceMotion = useReducedMotion();
  const visible = { opacity: 1, y: 0 };
  return (
    <motion.div
      className={className}
      initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
      animate={immediate ? visible : undefined}
      whileInView={immediate ? undefined : visible}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, ease: "easeOut", delay }}
    >
      {children}
    </motion.div>
  );
}
