"use client";

import { useEffect } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";

interface CountUpProps {
  value: number;
  className?: string;
  /** Digits after the decimal point. */
  decimals?: number;
}

export function CountUp({ value, className, decimals = 0 }: CountUpProps) {
  const motionValue = useMotionValue(0);
  const display = useTransform(motionValue, (latest) =>
    latest.toFixed(decimals),
  );
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (shouldReduceMotion) {
      motionValue.set(value);
      return;
    }
    const controls = animate(motionValue, value, {
      duration: 0.9,
      ease: "easeOut",
    });
    return () => controls.stop();
  }, [motionValue, value, shouldReduceMotion]);

  return (
    <span className={className}>
      <motion.span aria-hidden>{display}</motion.span>
      <span className="sr-only">{value.toFixed(decimals)}</span>
    </span>
  );
}
