"use client";

import { useEffect } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";

import { MOTION } from "./motion";

interface CountUpProps {
  value: number;
  className?: string;
  /** Digits after the decimal point. */
  decimals?: number;
  /** Left-pad with zeros to this many digits, e.g. 2 renders 7 as 07. */
  padTo?: number;
}

export function CountUp({
  value,
  className,
  decimals = 0,
  padTo = 0,
}: CountUpProps) {
  const motionValue = useMotionValue(0);
  const display = useTransform(motionValue, (latest) =>
    latest.toFixed(decimals).padStart(padTo, "0"),
  );
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (shouldReduceMotion) {
      motionValue.set(value);
      return;
    }
    const controls = animate(motionValue, value, MOTION.counter);
    return () => controls.stop();
  }, [motionValue, value, shouldReduceMotion]);

  return (
    <span className={className}>
      <motion.span aria-hidden>{display}</motion.span>
      <span className="sr-only">{value.toFixed(decimals)}</span>
    </span>
  );
}
